# GSugar Order Portal

This project now includes a simple backend so orders are saved centrally and can be viewed from the company portal (`admin.html`) and customer status page (`login.html`).

## Run locally

1. Open a terminal in the project folder.
2. Run `npm install`.
3. Run `npm start`.
4. Open `http://localhost:3000` in your browser.

## How it works

- `server.js` hosts a JSON API and serves the static site.
- Orders are saved in `data/orders.json`.
- `index.html` sends checkout data to `/api/orders`.
- `admin.html` loads orders from `/api/orders` and updates statuses via `PATCH`.
- `login.html` queries orders by email from `/api/orders`.
