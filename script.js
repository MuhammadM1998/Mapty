'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
	date = new Date();
	id = (Date.now() + '').slice(-10);

	constructor(coords, distance, duration) {
		this.coords = coords; // [Latitude,Longitude]
		this.distance = distance;
		this.duration = duration;
	}

	_setDescription() {
		// prettier-ignore
		const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
		// prettier-ignore
		const descriptionType = `${this.type[0].toUpperCase()}${this.type.slice(1)}`;
		const descriptionMonth = months[this.date.getMonth()];
		const descriptionDay = this.date.getDate();

		this.description = `${descriptionType} on ${descriptionMonth} ${descriptionDay}`;
	}
}

class Running extends Workout {
	type = 'running';

	constructor(coords, distance, duration, cadence) {
		super(coords, distance, duration);
		this.cadence = cadence;
		this.calcPace();
		this._setDescription();
	}

	calcPace() {
		this.pace = this.duration / this.distance;
		return this.pace;
	}
}

class Cycling extends Workout {
	type = 'cycling';

	constructor(coords, distance, duration, elevation) {
		super(coords, distance, duration);
		this.elevation = elevation;
		this.calcSpeed();
		this._setDescription();
	}

	calcSpeed() {
		this.speed = this.distance / (this.duration / 60);
		return this.speed;
	}
}

// Application Arhitechture
class App {
	#map;
	#mapEvent;
	#mapZoomLevel = 13;
	#workouts = [];

	constructor() {
		// Fetch data from local storage
		this._getLocalStorage();

		//Get User Position
		this._getPostition();

		// Event Handlers
		form.addEventListener('submit', this._newWorkout.bind(this));

		inputType.addEventListener(
			'change',
			this._toggleElevationField.bind(this)
		);

		containerWorkouts.addEventListener(
			'click',
			this._moveToPopup.bind(this)
		);
	}

	_getPostition() {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				this._loadMap.bind(this),
				function () {
					alert('Failed to get your location.');
				}
			);
		}
	}

	_loadMap(position) {
		const { latitude } = position.coords;
		const { longitude } = position.coords;
		const coords = [latitude, longitude];

		// Leaflet API
		this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

		L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
		}).addTo(this.#map);

		// Handling Clicks on map
		this.#map.on('click', this._showForm.bind(this));

		// Load data from local storage
		this.#workouts.forEach(workout => this._renderWorkoutMarker(workout));
	}

	_showForm(mapE) {
		this.#mapEvent = mapE;
		form.classList.remove('hidden');
		inputDistance.focus();
	}

	_hideForm() {
		// -- Clearing fields
		inputDistance.value = '';
		inputDuration.value = '';
		inputCadence.value = '';
		inputElevation.value = '';

		// -- Hide form and disable the transition
		form.style.display = 'none';
		form.classList.add('hidden');
		setTimeout(() => {
			form.style.display = 'grid';
		}, 1000);
	}

	_toggleElevationField(e) {
		inputElevation
			.closest('.form__row')
			.classList.toggle('form__row--hidden');
		inputCadence
			.closest('.form__row')
			.classList.toggle('form__row--hidden');
	}

	_newWorkout(e) {
		const isNumber = (...inputs) => inputs.every(i => Number.isFinite(i));

		const isPositive = (...inputs) => inputs.every(i => i > 0);

		e.preventDefault();

		// - Handling Form data
		// -- Get Data Form
		const { lat, lng } = this.#mapEvent.latlng;
		const type = inputType.value;
		const distance = +inputDistance.value;
		const duration = +inputDuration.value;
		let workout;

		// -- Creating Running Object
		if (type === 'running') {
			const cadence = +inputCadence.value;

			// -- Validate the data
			if (
				!isNumber(distance, duration, cadence) ||
				!isPositive(distance, duration, cadence)
			)
				return alert('Inputs has to be positive numbers');

			workout = new Running([lat, lng], distance, duration, cadence);
		}

		// -- Creating Cycling Object
		if (type === 'cycling') {
			const elevation = +inputElevation.value;

			// -- Validate the data
			if (
				!isNumber(distance, duration, elevation) ||
				!isPositive(distance, duration)
			)
				return alert('Inputs has to be positive numbers');

			workout = new Cycling([lat, lng], distance, duration, elevation);
		}

		// -- Add the object to Workouts Array
		this.#workouts.push(workout);

		// -- Render workout marker on the map
		this._renderWorkoutMarker(workout);

		// -- Render workout on list
		this._renderWorkout(workout);

		// -- Hide & Reset Form
		this._hideForm();

		//-- Set Local Storage
		this._setLocalStorage();
	}

	_renderWorkoutMarker(workout) {
		const markerCoords = workout.coords;
		const popupOptions = {
			maxWidth: 250,
			minWidth: 100,
			autoClose: false,
			closeOnClick: false,
			className: `${workout.type}-popup`,
		};
		L.marker(markerCoords)
			.addTo(this.#map)
			.bindPopup(L.popup(popupOptions))
			.setPopupContent(
				`${workout.type === 'running' ? '🏃' : '🚴'} ${
					workout.description
				}`
			)
			.openPopup();
	}

	_renderWorkout(workout) {
		let htmlMarkup = `
			<li class="workout workout--${workout.type}" data-id="${workout.id}">
				<h2 class="workout__title">${workout.description}</h2>
				
				<div class="workout__details">
					<span class="workout__icon">${workout.type === 'running' ? '🏃' : '🚴'}</span>
					<span class="workout__value">${workout.distance}</span>
					<span class="workout__unit">km</span>
				</div>

				<div class="workout__details">
					<span class="workout__icon">⏱</span>
					<span class="workout__value">${workout.duration}</span>
					<span class="workout__unit">min</span>
				</div>
		`;

		if (workout.type === 'running') {
			htmlMarkup += `
				<div class="workout__details">
					<span class="workout__icon">⚡️</span>
					<span class="workout__value">${workout.pace.toFixed(1)}</span>
					<span class="workout__unit">min/km</span>
				</div>

				<div class="workout__details">
					<span class="workout__icon">🦶🏼</span>
					<span class="workout__value">${workout.cadence}</span>
					<span class="workout__unit">spm</span>
				</div>
			</li>
		`;
		}

		if (workout.type === 'cycling') {
			htmlMarkup += `
				<div class="workout__details">
					<span class="workout__icon">⚡️</span>
					<span class="workout__value">${workout.speed.toFixed(1)}</span>
					<span class="workout__unit">km/h</span>
				</div>

				<div class="workout__details">
					<span class="workout__icon">⛰</span>
					<span class="workout__value">${workout.elevation}</span>
					<span class="workout__unit">m</span>
				</div>
			</li>
		`;
		}

		form.insertAdjacentHTML('afterend', htmlMarkup);
	}

	_moveToPopup(e) {
		const workoutElement = e.target.closest('.workout');

		if (!workoutElement) return;
		const workout = this.#workouts.find(
			work => work.id === workoutElement.dataset.id
		);
		console.log(workout);

		this.#map.setView(workout.coords, this.#mapZoomLevel, {
			animate: true,
			pan: {
				duration: 1,
			},
		});
	}

	_setLocalStorage() {
		localStorage.setItem('workouts', JSON.stringify(this.#workouts));
	}

	_getLocalStorage() {
		const data = JSON.parse(localStorage.getItem('workouts'));
		console.log(data);

		if (!data) return;
		this.#workouts = data;
		this.#workouts.forEach(workout => this._renderWorkout(workout));
	}

	reset() {
		localStorage.removeItem('workouts');
		location.reload();
	}
}
const app = new App();
