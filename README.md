# Nomi News

A responsive React news reader with an Express API. Headlines come from the free, keyless Google News RSS feed, with GDELT DOC API as a fallback. Each story links to its publisher.

## Run locally

```sh
npm install
npm run dev
```

Open the Vite URL shown in the terminal (usually http://localhost:5173). The Express API runs on port 5000 and Vite proxies `/api` requests to it.

## MongoDB

Copy `.env.example` to `.env` and set `MONGO_URI` to a local MongoDB or Atlas connection string. Contact messages are stored in MongoDB when connected. Without a URI, the contact endpoint accepts messages in temporary in-memory demo mode; they are cleared when the server stops.

The news endpoint caches each topic for five minutes. Available topics: world, business, technology, climate, culture.
