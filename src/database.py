from datetime import datetime
from sqlalchemy import create_engine, func, ForeignKey
from sqlalchemy.orm import sessionmaker, Mapped, mapped_column, DeclarativeBase


engine = create_engine("sqlite:///./sql_app.db", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit = False, autoflush = False, bind = engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class Base(DeclarativeBase):
    __abtract__ = True
    id: Mapped[int] = mapped_column(primary_key = True, unique = True)


class User(Base):
    __tablename__ = "user"

    user_uuid: Mapped[str]
    created_at: Mapped[datetime] =  mapped_column(server_default = func.now(), default = datetime.now())


class SearchedCity(Base):
    __tablename__ = "searched_cities"

    city_id: Mapped[str]
    city_name: Mapped[str]
    searched_count: Mapped[int] = mapped_column(default = 1)
    user_uuid: Mapped[str]
    user_id: Mapped[int] = mapped_column(ForeignKey('user.id', ondelete = 'CASCADE'))
