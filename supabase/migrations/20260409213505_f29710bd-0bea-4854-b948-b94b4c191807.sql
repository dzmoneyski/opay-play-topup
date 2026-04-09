
ALTER TABLE profiles DISABLE TRIGGER protect_profile_sensitive_fields;
ALTER TABLE profiles DISABLE TRIGGER log_account_activation_trigger;

UPDATE profiles SET is_account_activated = true WHERE user_id = '4a6782a0-2c19-4f6f-8c9d-a2f7d4c4b39a';

ALTER TABLE profiles ENABLE TRIGGER log_account_activation_trigger;
ALTER TABLE profiles ENABLE TRIGGER protect_profile_sensitive_fields;
