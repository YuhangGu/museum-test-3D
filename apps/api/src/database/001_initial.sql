CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TABLE models (id uuid PRIMARY KEY, storage_key text NOT NULL UNIQUE, original_filename text NOT NULL, model_type text NOT NULL CHECK (model_type IN ('current','historical','sample')), file_size bigint NOT NULL CHECK(file_size > 0), mime_type text NOT NULL CHECK(mime_type IN ('model/gltf-binary','model/gltf+json')), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE buildings (id uuid PRIMARY KEY, name text NOT NULL, description text NOT NULL, location geometry(Point,4326) NOT NULL, thumbnail_url text, current_model_id uuid REFERENCES models(id), historical_model_id uuid REFERENCES models(id), historical_year integer, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX buildings_location_idx ON buildings USING gist(location);
CREATE TABLE annotations (id uuid PRIMARY KEY, building_id uuid NOT NULL REFERENCES buildings(id) ON DELETE CASCADE, title text NOT NULL, description text NOT NULL, position_x double precision NOT NULL, position_y double precision NOT NULL, position_z double precision NOT NULL, historical_period text, image_url text, source_reference text);
CREATE INDEX annotations_building_idx ON annotations(building_id);
CREATE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER buildings_updated_at BEFORE UPDATE ON buildings FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
