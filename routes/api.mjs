import express from 'express' 
const router = express.Router()
import Story from "../models/Story"


// Store your Google Maps API Key as an  environment variable called GOOGLE_KEY 
/* The frontend may request the Google API Key via this endpoint. */
router.get('/apikey', (req,res) => {
  /* We will not share our API Key outside of our own domain. */ 
  if ( req.get('referer').includes('://' + req.get('host')) ){
    res.send({ 
      "Status":"OK", 
      "GOOGLE_KEY":process.env.GOOGLE_KEY 
    })
  }
  else{
    res.send({ 
      "Status": "Error", 
      "Message": "Google API Key is not authorized for this domain." ,
      "Referer" : req.headers.referer,
      "Expected" : req.get('host')
     })
  }
})

/** Endpoint for fetching nearby stories from MongoDB */
// the user's location is passed along via query parameters
router.get('/stories', async (req,res) => {
   // Query mongoDB for nearby stories using the $near operator
   // see also: https://www.mongodb.com/docs/manual/reference/operator/query/near/
   let stories = await Story.find({
        "location": {
          $near: {
            $geometry: {
              type: "Point" ,
              coordinates: [ req.query.lng , req.query.lat ]
            },
            $maxDistance: 1000000
          }
        }
    }).limit(10)
   res.send(stories) 
})

/* This endpoint is for adding a new story. 
 The frontend sends lat/lng coordinates and Content/Text as JSON in the body of the request. 
 We parse this JSON using the "bodyParser" middleware and save it to MongoDB.
 see also: https://www.npmjs.com/package/body-parser  */
router.post('/story', (req, res) => {
  /* todo: insert new story into mongo */  
  let story = new Story({ 
    "content": req.body.content,
    "location":  req.body.location 
  })
  story.save().then((status) => {
    console.log(status)
    res.send({
      "status" : status
    })
  }) 
})



export default router