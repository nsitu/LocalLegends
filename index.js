/*
  This is the  backend of the Local Legends app. (NodeJS) 
  It gets API Keys from the environment.
  It listens for requests from the frontend.
  It fetches communicates with MongoDB.

  Location Picker adapted from:
  https://thisinterestsme.com/google-maps-api-location-picker-example/

*/


// Express is a framework for building APIs and web apps
// See also: https://expressjs.com/
import express from 'express' 
// connect to MongoDB
import connectToMongo from './database.mjs'
// Initialize Express
const app = express()

// CORS middleware add CORS headers to our endpoints 
// This will allow us to use the API on any domain. 
// See also: https://www.npmjs.com/package/cors
// Tell our Express app to add CORS headers
import cors from 'cors'
app.use(cors())


/* Serve up static assets, i.e. the Frontend of the site. */
app.use('/', express.static('public'))  

// Enable express to parse JSON data
app.use(express.json())  

import endpoints from './routes/api.mjs'
app.use('/api', endpoints )

// Express starts listening only after MongoDB connects
connectToMongo.then( () => {
  app.listen( process.env.PORT, () => console.log("Express is Live."))
})

