CREATE TABLE public.whatsapp_bot_messages (
  uid text PRIMARY KEY,
  chat_id bigint NOT NULL,
  direction text NOT NULL DEFAULT 'in',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX whatsapp_bot_messages_chat_idx ON public.whatsapp_bot_messages (chat_id, direction);
CREATE TABLE public.whatsapp_bot_chats (
  chat_id bigint PRIMARY KEY,
  latest_in_uid text,
  answered_uid text,
  handoff_until timestamptz,
  last_alert_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.whatsapp_bot_messages TO service_role;
GRANT ALL ON public.whatsapp_bot_chats TO service_role;
ALTER TABLE public.whatsapp_bot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_bot_chats ENABLE ROW LEVEL SECURITY;