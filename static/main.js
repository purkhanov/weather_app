const titleElement = document.getElementById('title')
const searchInputElement = document.getElementById('search')
const guessElement = document.getElementById('search-guess')

const cityNameElement = document.getElementById('city-name')
const timeElement = document.getElementById('time')
const tempElement = document.getElementById('temp')
const conditionElement = document.getElementById('condition')
const forecastdaysElement = document.getElementById('forecastdays')
const imgIconElement = document.getElementById('img-icon')
const modalElement = document.getElementById('modal')
const historyElement = document.getElementById('history')
const countryNameElement = document.getElementById('country')


let timeout = null
let currentDay = new Date().toLocaleDateString('en-us' ,{
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})
let weatherData = {}

titleElement.innerText = currentDay

searchInputElement.addEventListener('input', serchHandle)
guessElement.addEventListener('click', getCityWeather)
modalElement.addEventListener('click', showModal)

historyElement.addEventListener('click', async () => {
  modalElement.style.display = 'block'
  const lastSearch = getLocalData()
  if (lastSearch !== null) {
    await showHistoryModal()
  } else {
    while (modalElement.firstChild) {
      modalElement.removeChild(modalElement.firstChild)
    }
    const div = document.createElement('div')
    div.classList.add('modal-content')
    div.innerText = 'Вы ничего не искали'
    modalElement.append(div)
  }
})

function onMounted() {
  const lastSearch = getLocalData()
  if (lastSearch) {
    lastSearchedModal()
    modalElement.style.display = 'block'
  }
}

function getLocalData() {
  return JSON.parse(localStorage.getItem('lastSearchedCity'))
}

async function getCityWeather(e = null, localData) {
  let cityId = e === null ? localData.id : e.target.id
  let cityName = e === null ? localData.name : e.target.innerText
  let user_uuid = localData === undefined ? null : localData.user_uuid
  let url

  const locD = getLocalData()
  if (locD !== null) {
    user_uuid = locD.user_uuid
    url = `/city-weather?city_id=${cityId}&city_name=${cityName}&user_uuid=${user_uuid}`
  } else {
    url = `/city-weather?city_id=${cityId}&city_name=${cityName}`
  }
  
  const res = await fetch(url)
  weatherData = await res.json()
  setWeather()
  
  const lastSearch = {
    id: cityId,
    name: weatherData.location.name,
    time: (Date.now() / 1000) + 3600,
    user_uuid: weatherData.user_uuid
  }

  localStorage.setItem('lastSearchedCity', JSON.stringify(lastSearch))
 
  searchInputElement.value = ''
  guessElement.style.display = 'none'

  while (guessElement.firstChild) {
    guessElement.removeChild(guessElement.firstChild)
  }
}

async function setWeather() {
  const dateString = new Date(weatherData.location.localtime)
  const hours = dateString.getHours()
  const minutes = dateString.getMinutes()

  cityNameElement.innerText = weatherData.location.name
  countryNameElement.innerText = weatherData.location.country
  timeElement.innerText = hours + ":" + minutes
  tempElement.innerText = weatherData.current.temp_c
  imgIconElement.src = weatherData.current.condition.icon
  conditionElement.innerText = weatherData.current.condition.text
  forecastdaysElement.append(addForecastDay(weatherData.forecast.forecastday))
}

function addForecastDay(days) {
  while (forecastdaysElement.firstChild) {
    forecastdaysElement.removeChild(forecastdaysElement.firstChild)
  }
  const fragment = document.createDocumentFragment()
  
  for (let day of days) {
    const div = document.createElement('div')

    const dayEl = `
      <div class="item">
        <div class="day">${day.date}</div>
        <div class="day-icon">
          <img id="img-icon" src="${day.day.condition.icon}" alt="Icon">
        </div>
        <div class="day-temp">${day.day.maxtemp_c}/${day.day.maxtemp_c}<span>°</span></div>
      </div>
    `
    div.insertAdjacentHTML('afterbegin', dayEl)
    fragment.append(div)
  }
  return fragment
}


function serchHandle() {
  let searchVal = searchInputElement.value

  while (guessElement.firstChild) {
    guessElement.removeChild(guessElement.firstChild)
  }

  clearTimeout(timeout)
  timeout = setTimeout(async () => {
    if (searchVal && searchVal !== ' ') {
      guessElement.style.display = 'block'

      const res = await fetch(`http://api.weatherapi.com/v1/search.json?key=d752dbf21cbc49e09e7145835241707&q=${searchVal}`)      
      const data = await res.json()
      guessElement.append(addElements(data))
    } else {
      guessElement.style.display = 'none'
    }
  }, 300)
}

function addElements(data) {
  let fragment = document.createDocumentFragment()

  data.forEach(val => {
    const div = document.createElement('div')
    const el = `
      <div id="${val.id}" class="guess-item">
        ${val.name}, ${val.country}
      </div>
    `
    div.insertAdjacentHTML('beforeend', el)
    fragment.append(div)
  })
  return fragment
}

function showModal({target}) {
  if (target.classList.contains('modal') || target.id === 'cancel') {
    modalElement.style.display = 'none'
  } else if (target.id === 'yes') {
    const lastSearch = getLocalData()
    getCityWeather(null, lastSearch)
    modalElement.style.display = 'none'
  }
}

function lastSearchedModal() {
  if (modalElement.firstChild) {
    modalElement.removeChild(modalElement.firstChild)
  }
  const localData = getLocalData()
  const div = document.createElement('div')
  div.classList.add('modal-content')

  const el = `
    <div class="title">Вы последний раз искали ${localData.name} Хотите посмотреть?</div>
    <button id="yes">Да</button>
    <button id="cancel">Нет</button>
  `
  div.insertAdjacentHTML('afterbegin', el)
  modalElement.append(div)
}

async function showHistoryModal() {
  if (modalElement.firstChild) {
    modalElement.removeChild(modalElement.firstChild)
  }

  const localData = getLocalData()

  const res = await fetch(`/serch-count?user_uuid=${localData.user_uuid}`)      
  const data = await res.json()

  const div = document.createElement('div')
  div.classList.add('modal-content')
  
  for (let val of data) {
    const divHistory = document.createElement('div')
    divHistory.classList.add('history-item')

    const el = `
      <div>${val.city_name}</div>
      <div>${val.searched_count}</div>
    `
    divHistory.insertAdjacentHTML('afterbegin', el)
    div.append(divHistory)
  }
  modalElement.append(div)
}

onMounted()
