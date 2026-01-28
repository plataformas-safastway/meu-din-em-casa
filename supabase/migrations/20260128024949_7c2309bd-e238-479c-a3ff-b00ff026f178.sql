-- Add new integration providers to enum
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'LOVABLE_AI';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'OPENSTREETMAP';