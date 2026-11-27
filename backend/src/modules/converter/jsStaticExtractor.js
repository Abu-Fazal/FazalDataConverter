import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import fs from 'fs/promises';

/**
 * Extracts static JavaScript literal values, objects, and arrays from an Acorn AST Node.
 * Rejects functions, calls, and dynamic expressions with ZERO CODE EXECUTION (TRD §7.12).
 */
function extractValueFromNode(node) {
  if (!node) return null;

  switch (node.type) {
    case 'Literal':
      return node.value;

    case 'ArrayExpression':
      return node.elements.map((el) => extractValueFromNode(el));

    case 'ObjectExpression': {
      const obj = {};
      for (const prop of node.properties) {
        if (prop.type === 'Property') {
          const key = prop.key.type === 'Identifier' ? prop.key.name : prop.key.value;
          obj[key] = extractValueFromNode(prop.value);
        }
      }
      return obj;
    }

    case 'UnaryExpression':
      // Support negative numbers like -5
      if (node.operator === '-' && node.argument.type === 'Literal') {
        return -node.argument.value;
      }
      if (node.operator === '+' && node.argument.type === 'Literal') {
        return +node.argument.value;
      }
      return null;

    default:
      // Disallow function calls, identifiers, or dynamic execution
      return null;
  }
}

/**
 * Safely parses JavaScript code using Acorn AST.
 * Extracts data from `const data = [...]`, `module.exports = {...}`, `export default [...]`.
 */
export async function extractStaticJsData(filePathOrCode, isRawCode = false) {
  let code = filePathOrCode;
  if (!isRawCode) {
    code = await fs.readFile(filePathOrCode, 'utf-8');
  }

  // Parse pure AST without evaluating or running code
  let ast;
  try {
    ast = acorn.parse(code, {
      ecmaVersion: 'latest',
      sourceType: 'module',
    });
  } catch (parseErr) {
    throw new Error(`SYNTAX_ERROR: JavaScript could not be parsed: ${parseErr.message}`);
  }

  let extractedData = null;
  const variableCandidates = {};

  walk.simple(ast, {
    // 1. Variable declarations: const data = [ ... ]
    VariableDeclarator(node) {
      if (node.id.type === 'Identifier' && (node.init?.type === 'ArrayExpression' || node.init?.type === 'ObjectExpression')) {
        variableCandidates[node.id.name] = extractValueFromNode(node.init);
      }
    },
    // 2. Export default [ ... ]
    ExportDefaultDeclaration(node) {
      if (node.declaration.type === 'ArrayExpression' || node.declaration.type === 'ObjectExpression') {
        extractedData = extractValueFromNode(node.declaration);
      } else if (node.declaration.type === 'Identifier' && variableCandidates[node.declaration.name]) {
        extractedData = variableCandidates[node.declaration.name];
      }
    },
    // 3. module.exports = [ ... ]
    AssignmentExpression(node) {
      if (
        node.left.type === 'MemberExpression' &&
        node.left.object.name === 'module' &&
        node.left.property.name === 'exports'
      ) {
        extractedData = extractValueFromNode(node.right);
      }
    },
  });

  // If no export was found, fallback to largest extracted array/object candidate
  if (!extractedData && Object.keys(variableCandidates).length > 0) {
    const keys = Object.keys(variableCandidates);
    extractedData = variableCandidates[keys[0]];
  }

  if (!extractedData) {
    throw new Error('NO_STATIC_DATA_FOUND: No static object or array declarations found in JavaScript file.');
  }

  return {
    success: true,
    data: extractedData,
    type: Array.isArray(extractedData) ? 'array' : typeof extractedData,
    count: Array.isArray(extractedData) ? extractedData.length : Object.keys(extractedData).length,
  };
}
