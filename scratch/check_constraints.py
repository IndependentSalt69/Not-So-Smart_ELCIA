from src.db.session import engine
from sqlalchemy import text

def main():
    with engine.connect() as conn:
        r = conn.execute(text("SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'incident_type';"))
        print(r.fetchall())

if __name__ == "__main__":
    main()
