-- Set Singapore timezone as default for new database sessions.
-- Note: this affects display and NOW() context for new connections.

alter database postgres set timezone to 'Asia/Singapore';
alter role anon set timezone to 'Asia/Singapore';
alter role authenticated set timezone to 'Asia/Singapore';
alter role service_role set timezone to 'Asia/Singapore';
