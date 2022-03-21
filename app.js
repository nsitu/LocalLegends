/*
  This is the  backend of the Local Legends app. (NodeJS) 
  It gets API Keys from the environment.
  It listens for requests from the frontend.
  It fetches communicates with MongoDB.

  Location Picker adapted from:
  https://thisinterestsme.com/google-maps-api-location-picker-example/

*/

/* import environment variables */
require('dotenv').config()

const GOOGLE_KEY = process.env.GOOGLE_KEY || ''		/* API key for use with Google Maps */
const MONGODB_URI = process.env.MONGODB_URI || ''		/* Connection String for MongoDB */

// OPTIONAL Config
const ADDRESS = process.env.ADDRESS || ''  	/* e.g., https://locallengends.herokuapp.com - limit API key to your own domain */
const ROOT_URL = process.env.ROOT_URL || '' /* e.g. "/locallegends" -- use this to deploy inside a subfolder. */
const PORT = process.env.PORT || 5000			  /* e.g. 1234 - PORT number */
 
// SETUP MONGODB
const mongoose = require('mongoose');     // mongoose / mongodb object modeling
/* define a story schema with a geoJSON location field 
see also: https://mongoosejs.com/docs/geojson.html */ 
const storySchema = new mongoose.Schema({ 
  "content": String, 
  "location": {
    type: {  type: String,  enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true }
  }
});
/* A 2D sphere index enables MongoDB's $near query operator */
storySchema.index({ location: '2dsphere' });
/* create a model / instance of the Story Schema  */ 
const Story = mongoose.model('Story', storySchema)
/** Connect to MongoDB */
mongoose.connect(MONGODB_URI);

/* Setup Express */
const express = require ('express')   // express framework 
const cors = require ('cors')         // Cross Origin Resource Sharing
const bodyParser = require('body-parser') // middleware to parse JSON data that is sent from the frontend.
const app = express(); // enable express
app.use( cors() ); // make express attach CORS headers to responses
app.use( express.json() ); // add json capabilities to our express aptestingp

/* Serve up static assets, i.e. the Frontend of the site. */
app.use(ROOT_URL+'/', express.static('public'))  

/* The frontend may request the Google API Key via this endpoint. */
app.get(ROOT_URL+'/apikey', (req,res) => {
  /* We will not share our API Key outside of our own domain. */
  if ( req.headers.referer.startsWith(ADDRESS) ){
    res.send({ "Status":"OK", "GOOGLE_KEY":GOOGLE_KEY })
  }
  else{
    res.send({ "Status": "Error", 
	      "Message": "Google API Key is not authorized for this domain." ,
	      "Referer" : req.headers.referer,
	      "Expected" : ADDRESS
     })
  }
})

/** Endpoint for fetching nearby stories from MongoDB */
app.post(ROOT_URL+'/stories/', bodyParser.json(), async (req,res) => {
   /* Query mongoDB for nearby stories */ 
   let stories = await Story.find({
        "location": {
          $near: {
            $geometry: {
              type: "Point" ,
              coordinates: [ req.body.lng , req.body.lat ]
            },
            $maxDistance: 100000
          }
        }
    });
   res.send(stories);
  
})

/* This endpoint is for adding a new story. 
 The frontend sends lat/lng coordinates and Content/Text as JSON in the body of the request. 
 We parse this JSON using the "bodyParser" middleware and save it to MongoDB.
 see also: https://www.npmjs.com/package/body-parser  */
app.post(ROOT_URL+'/story', bodyParser.json(), (req, res) => {
  /* todo: insert new story into mongo */  
  let story = new Story({ 
    "content": req.body.content,
    "location":  req.body.location 
  });
  story.save().then((status) => {
    console.log(status)
    res.send({
      "status" : status
    });
  }); 
});

//Go live
app.listen(PORT, () => {
  console.log("We are live " );
});
