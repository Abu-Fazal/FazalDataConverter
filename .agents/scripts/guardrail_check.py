import sys
import json
import re
import os

WORKSPACE_DIR = os.path.normpath(r"d:\OneDrive\Desktop\FazalDataConverter").lower()
BRAIN_DIR = os.path.normpath(r"c:\users\fazal\.gemini\antigravity").lower()

def block(reason):
    return {"decision": "deny", "reason": f"🛡️ GUARDRAIL BLOCKED: {reason}"}

def allow():
    return {"decision": "allow"}

def ask(reason):
    return {"decision": "ask", "reason": f"⚠️ CONFIRMATION REQUIRED: {reason}"}

def check_command(cmd_line):
    cmd_lower = cmd_line.lower().strip()

    # 1. GIT / GITHUB LOCKDOWN (USER ONLY)
    if re.search(r'\bgit\s+(add|commit|push|pull|rebase|merge|reset|checkout|branch|tag|remote|clean|init|clone|cherry-pick|stash)\b', cmd_lower):
        return block("Git commands (add, commit, push, etc.) are strictly reserved for the USER only.")
    if re.search(r'\b(gh|git)\b', cmd_lower) and any(kw in cmd_lower for kw in ['push', 'commit', 'pr create', 'release', 'repo']):
        return block("GitHub CLI actions are reserved for the USER only.")

    # 2. DATABASE DESTRUCTIVE / SENSITIVE OPERATIONS (MONGODB / SQL)
    db_destructive = [
        r'\bdropdatabase\b', r'\.drop\(', r'\.deletemany\(', r'\.remove\(',
        r'\bmongosh\b.*--eval.*drop', r'\bmongoose\..*drop',
        r'\bdrop\s+table\b', r'\bdelete\s+from\b', r'\btruncate\s+table\b',
        r'\bdrop\s+database\b', r'\.deleteone\('
    ]
    for pattern in db_destructive:
        if re.search(pattern, cmd_lower):
            return block("Database deletion or drop operations are strictly forbidden without explicit instruction.")

    # 3. FILE / FOLDER DELETION COMMANDS
    del_patterns = [
        r'\b(rm|rmdir|del|erase)\b',
        r'\bremove-item\b',
        r'\bshutil\.rmtree\b',
        r'\bfs\.unlink\b', r'\bfs\.rm\b', r'\bfs\.rmdir\b'
    ]
    for pattern in del_patterns:
        if re.search(pattern, cmd_lower):
            return block("Direct deletion of files or folders via shell command is blocked.")

    # 4. PACKAGE MANAGEMENT (NPM INSTALL / ADD / UNINSTALL) - Point 4 user selection
    npm_critical = [
        r'\bnpm\s+(install|i|add|uninstall|remove|update)\b',
        r'\bpnpm\s+(install|i|add|remove|update)\b',
        r'\byarn\s+(add|remove|upgrade)\b'
    ]
    for pattern in npm_critical:
        if re.search(pattern, cmd_lower):
            return ask("Installing or altering npm packages requires explicit user confirmation.")

    # 5. ENVIRONMENT FILE ACCESS (.env, .env.*) READ / CAT / PRINT BLOCK
    env_inspect = [
        r'\b(cat|type|get-content|gc|more|head|tail)\b.*\.env',
        r'\bcurl\b.*\.env',
        r'\bprintenv\b',
        r'\b(export|set)\b'
    ]
    for pattern in env_inspect:
        if re.search(pattern, cmd_lower):
            return block("Inspecting or dumping .env credentials via command is strictly prohibited.")

    # 6. EXTERNAL NETWORK LEAK / UNAPPROVED DEPLOYMENT / TUNNELS
    outbound_risk = [
        r'\b(ngrok|localtunnel|cloudflared|telepresence)\b',
        r'\b(vercel\s+deploy|railway\s+up|fly\s+deploy|netlify\s+deploy)\b'
    ]
    for pattern in outbound_risk:
        if re.search(pattern, cmd_lower):
            return block("Direct cloud deployment or public tunneling is blocked without user approval.")

    # 7. WORKSPACE ESCAPE CHECK (In command lines)
    if any(esc in cmd_lower for esc in ['cd ..\\..', 'cd ../..', 'c:\\windows', 'c:\\program files']):
        return block("Navigating outside the workspace boundary is strictly prohibited.")

    return allow()

def check_file_tool(tool_name, args):
    path = args.get("Path", "")
    content = args.get("Content", "") + args.get("Replacement", "")
    norm_path = os.path.normpath(path).lower()

    # 1. WORKSPACE BOUNDARY LOCK
    if not (norm_path.startswith(WORKSPACE_DIR) or norm_path.startswith(BRAIN_DIR)):
        return block(f"Accessing or modifying paths outside the workspace is blocked: {path}")

    # 2. .ENV FILE READ / WRITE / OVERWRITE PROTECTION
    file_name = os.path.basename(norm_path)
    if file_name.startswith(".env") and not file_name.endswith(".example"):
        if tool_name == "read_file":
            return block("Direct reading of active .env files is blocked to prevent accidental secret leakage.")
        if tool_name in ["write_file", "edit_file"]:
            return ask(f"Modifying environment credentials in {file_name} requires explicit user review.")

    # 3. TYPOGRAPHY CHECK (Point 2: Inter only, block Plus Jakarta Sans or unauthorized fonts)
    if tool_name in ["write_file", "edit_file"]:
        unauthorized_fonts = ["plus jakarta sans", "poppins", "roboto", "helvetica", "comic sans", "montserrat"]
        for font in unauthorized_fonts:
            if font in content.lower():
                return block(f"Font violation detected! Found '{font}'. Only 'Inter' is allowed across FazalDataConverter.")

    # 4. HARDCODED SECRETS & KEYS DETECTION
    if tool_name in ["write_file", "edit_file"]:
        secret_patterns = [
            (r'mongodb(\+srv)?://[^:\s]+:[^@\s]+@', "MongoDB Connection String with raw credentials"),
            (r'ey[a-za-z0-9-_=]+\.[a-za-z0-9-_=]+\.?[a-za-z0-9-_.+/=]*', "JWT Token"),
            (r'(?i)(api_key|secret_key|r2_secret|jwt_secret)\s*[:=]\s*["\'][a-za-z0-9_\-]{16,}["\']', "Hardcoded secret or API key")
        ]
        # Ignore check if this is the guardrail script itself or documentation
        if not ("guardrail_check" in norm_path or norm_path.endswith(".md")):
            for pattern, desc in secret_patterns:
                if re.search(pattern, content):
                    return block(f"Secret leak prevented! Hardcoding {desc} is strictly prohibited. Use environment variables.")

    # 5. DANGEROUS CODE INJECTION IN CODE BASE
    if tool_name in ["write_file", "edit_file"]:
        # Disallow eval, child_process.exec without validation, or arbitrary macro execution
        dangerous_calls = [
            (r'\beval\(', "eval() is prohibited"),
            (r'\bchild_process\.execSync\(', "execSync execution is prohibited in source files")
        ]
        if not ("guardrail_check" in norm_path or norm_path.endswith(".md")):
            for pattern, desc in dangerous_calls:
                if re.search(pattern, content):
                    return block(f"Security hazard: {desc}")

    return allow()

def main():
    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            print(json.dumps(allow()))
            return

        payload = json.loads(raw_input)
        tool_call = payload.get("toolCall", {})
        tool_name = tool_call.get("name", "")
        args = tool_call.get("args", {})

        if tool_name == "run_command":
            cmd = args.get("CommandLine", "")
            result = check_command(cmd)
            print(json.dumps(result))
            return

        if tool_name in ["write_file", "edit_file", "read_file"]:
            result = check_file_tool(tool_name, args)
            print(json.dumps(result))
            return

        print(json.dumps(allow()))
    except Exception as e:
        print(json.dumps({"decision": "ask", "reason": f"Guardrail error: {str(e)}"}))

if __name__ == "__main__":
    main()
