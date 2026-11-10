"""Exercise recovery rules without importing the database-backed app package."""
import ast
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import Mock

source = Path(__file__).resolve().parents[1] / 'app/services/auth_s.py'
tree = ast.parse(source.read_text(encoding='utf-8'))
functions = {'_validate_reset_code', 'verify_password_reset_code', 'confirm_password_reset'}
code = compile(ast.Module(body=[node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in functions], type_ignores=[]), str(source), 'exec')


class RecoveryTests(unittest.TestCase):
    def setUp(self):
        self.user = SimpleNamespace(id=1, password='old-password')
        self.token = SimpleNamespace(code_hash='123456', attempts=0, used_at=None)
        self.repo = Mock()
        self.repo.find_by_email.return_value = self.user
        self.repo.latest_valid_reset_token.return_value = self.token
        self.scope = dict(datetime=datetime, timezone=timezone, auth_repository=self.repo,
                          verify_password=lambda stored, value: stored == value,
                          hash_password=lambda value: 'hashed:' + value)
        exec(code, self.scope)

    def test_verification_does_not_consume_code_or_change_password(self):
        self.assertIsNone(self.scope['verify_password_reset_code']('user@example.com', '123456')[1])
        self.assertIsNone(self.token.used_at)
        self.assertEqual(self.user.password, 'old-password')
        self.repo.commit.assert_not_called()
        self.assertIsNone(self.scope['confirm_password_reset']('user@example.com', '123456', 'new-password')[1])
        self.assertEqual(self.user.password, 'hashed:new-password')
        self.assertIsNotNone(self.token.used_at)

    def test_wrong_code_blocks_after_five_attempts(self):
        for _ in range(5):
            self.assertEqual(self.scope['verify_password_reset_code']('user@example.com', '999999')[2], 400)
        self.assertEqual(self.token.attempts, 5)
        self.assertIsNotNone(self.token.used_at)
        self.assertEqual(self.scope['confirm_password_reset']('user@example.com', '123456', 'new-password')[2], 400)
        self.assertEqual(self.user.password, 'old-password')

    def test_expired_or_used_code_is_rejected_even_after_verification(self):
        self.assertIsNone(self.scope['verify_password_reset_code']('user@example.com', '123456')[1])
        self.repo.latest_valid_reset_token.return_value = None
        self.assertEqual(self.scope['confirm_password_reset']('user@example.com', '123456', 'new-password')[2], 400)
        self.assertEqual(self.user.password, 'old-password')

    def test_unknown_email_is_rejected(self):
        self.repo.find_by_email.return_value = None
        self.assertEqual(self.scope['verify_password_reset_code']('missing@example.com', '123456')[2], 400)
        self.repo.latest_valid_reset_token.assert_not_called()


if __name__ == '__main__':
    unittest.main()
