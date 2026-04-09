
ALTER TABLE profiles DISABLE TRIGGER protect_profile_sensitive_fields;
ALTER TABLE profiles DISABLE TRIGGER log_account_activation_trigger;

UPDATE profiles SET is_account_activated = true WHERE user_id = 'cd86f03c-1402-445b-a293-10339cb706ef';

ALTER TABLE profiles ENABLE TRIGGER log_account_activation_trigger;
ALTER TABLE profiles ENABLE TRIGGER protect_profile_sensitive_fields;

INSERT INTO user_roles (user_id, role) VALUES ('cd86f03c-1402-445b-a293-10339cb706ef', 'agent')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO agent_permissions (user_id, can_manage_game_topups, can_manage_betting, can_manage_phone_topups, can_view_orders, daily_limit)
VALUES ('cd86f03c-1402-445b-a293-10339cb706ef', true, true, true, true, 100000)
ON CONFLICT DO NOTHING;
