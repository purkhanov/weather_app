import aiohttp
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import status
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi import Request, Depends
from fastapi.responses import HTMLResponse
from fastapi import FastAPI, HTTPException
from src.config import TEMPLATES_DIR, STATIC_DIR
from .database import Base, engine, get_db, User, SearchedCity
from sqlalchemy.orm import Session
from sqlalchemy import select, update


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind = engine)
    yield
    Base.metadata.drop_all(bind = engine)


templates = Jinja2Templates(directory = str(TEMPLATES_DIR))
app = FastAPI(lifespan = lifespan)
app.mount(str("/static"), StaticFiles(directory=str(STATIC_DIR)), name="static")



@app.get("/", response_class = HTMLResponse)
async def index(request: Request, db: Session = Depends(get_db)):
    try:
        weather_data = await get_city_weather(city_id = '2145091')
    except:
        raise HTTPException(
            detail='server error',
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    localtime = weather_data['location']['localtime']
    localtime = datetime.strptime(localtime, '%Y-%m-%d %H:%M').strftime('%H:%M')
    return templates.TemplateResponse('index.html', {'request': request, 'data': weather_data, 'localtime': localtime})


@app.get('/city-weather')
async def weather(city_id: str, city_name: str, user_uuid: str | None = None, db: Session = Depends(get_db)):
    if not user_uuid:
        _uuid = str(uuid.uuid4())

        new_user = User(user_uuid = _uuid)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        searched_city = SearchedCity(
            city_id = city_id,
            city_name = city_name,
            user_uuid = _uuid,
            user_id = new_user.id
        )
        db.add(searched_city)
        db.commit()

        weather_info = await get_city_weather(city_id)
        weather_info['user_uuid'] = _uuid
        return weather_info
    else:
        stmt1 = select(SearchedCity).filter(SearchedCity.city_id == city_id, SearchedCity.user_uuid == user_uuid)
        searched_cities_res = db.execute(stmt1)
        searched_city = searched_cities_res.scalars().first()

        if searched_city:
            stmt = (
                update(SearchedCity)
                .where(
                    SearchedCity.user_uuid == user_uuid,
                    SearchedCity.city_id == city_id
                )
                .values(searched_count = searched_city.searched_count + 1)
            )
            db.execute(stmt)
            db.commit()
            weather_info = await get_city_weather(city_id)
            weather_info['user_uuid'] = user_uuid
            return weather_info
        else:
            user_stmt = select(User).where(User.user_uuid == user_uuid)
            user_res = db.execute(user_stmt)
            user = user_res.scalars().first()

            if not user:
                return

            searched_city = SearchedCity(
                city_id = city_id,
                city_name = city_name,
                user_uuid = user.user_uuid,
                user_id = user.id
            )
            db.add(searched_city)
            db.commit()
            weather_info = await get_city_weather(city_id)
            weather_info['user_uuid'] = user.user_uuid
            return weather_info


async def get_city_weather(city_id: str):
    async with aiohttp.ClientSession() as session:
        async with session.get(f'http://api.weatherapi.com/v1/forecast.json?key=d752dbf21cbc49e09e7145835241707&q=id:{city_id}&days=3&aqi=no&alerts=no') as response:
            return await response.json()


@app.get('/serch-count')
async def search_count(user_uuid: str, db: Session = Depends(get_db)):
    stmt = select(SearchedCity).where(SearchedCity.user_uuid == user_uuid)
    res = db.execute(stmt)
    res = res.scalars().all()
    return res


@app.get('/ping')
async def ping():
    return {'pong': 'pong'}
