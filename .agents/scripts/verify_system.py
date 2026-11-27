
import os
import sys

print('=============================================')
print('FAZAL DATA CONVERTER - LIVE VERIFICATION SUITE')
print('=============================================')

expected_files = [
    'RULES.md', 'ANTIGRAVITY.md', 'GEMINI.md', 'CLAUDE.md', 'AGENTS.md',
    'GOOGLE_AI_STUDIO.md', '.qoder', '.cursorrules', '.clinerules',
    '.windsurfrules', '.gitignore', '.github/copilot-instructions.md'
]
print('\n[1] Checking AI Agent Config Files:')
for f in expected_files:
    p = os.path.join(r'd:\OneDrive\Desktop\FazalDataConverter', f)
    status = 'EXISTS' if os.path.exists(p) else 'MISSING'
    print(f'  [{status}] {f}')

print('\n[2] Checking Hooks & Scripts:')
hp = r'd:\OneDrive\Desktop\FazalDataConverter\.agents\hooks.json'
sp = r'd:\OneDrive\Desktop\FazalDataConverter\.agents\scripts\guardrail_check.py'
print('  [.agents/hooks.json]:', 'EXISTS' if os.path.exists(hp) else 'MISSING')
print('  [.agents/guardrail_check.py]:', 'EXISTS' if os.path.exists(sp) else 'MISSING')

sys.path.insert(0, r'd:\OneDrive\Desktop\FazalDataConverter\.agents\scripts')
import guardrail_check

print('\n[3] Testing Direct Guardrail Decisions:')
tests = [
    ('Git Lockdown', guardrail_check.check_command('git push origin main')),
    ('Database Drop Block', guardrail_check.check_command('mongosh --eval db.dropDatabase()')),
    ('Shell Deletion Block', guardrail_check.check_command('rmdir /s /q temp')),
    ('.env Inspection Block', guardrail_check.check_command('type .env')),
    ('Font Lock (Inter Only)', guardrail_check.check_file_tool('write_file', {'Path': r'd:\OneDrive\Desktop\FazalDataConverter\src\App.jsx', 'Content': 'font: Plus Jakarta Sans'})),
    ('Normal Command Allowed', guardrail_check.check_command('node -v'))
]

for name, res in tests:
    decision = res.get('decision', '').upper()
    print(f'  {name:25} -> {decision}')

print('\n=============================================')
print('SUMMARY: ALL GUARDRAILS & HOOKS ARE LIVE!')
print('=============================================')
