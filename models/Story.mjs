import mongoose from 'mongoose'


// To put stories on a map, we must persist geographic data.
// For context, note that MongoDB stores Geographic data in GeoJSON format.
// https://www.mongodb.com/docs/manual/reference/geojson/#point

// In mongoose we can make a dedicated schema to describe a GeoJSON point
// See also: https://mongoosejs.com/docs/geojson.html#points
const pointSchema = new mongoose.Schema({
  type: {  
    type: 'String',  
    enum: ['Point'], 
    required: true 
  },
  coordinates: { 
    type: ['Number'], 
    required: true ,
    default: [0, 0]
  }
})

// Below is the schema for stories
// notice it includes the above point Schema as a 'subdocument'
 const storySchema = new mongoose.Schema({
    content: { type: 'String' },
    location: { type: pointSchema }
})

// We can further optimize geospatial queries in MongoDB by using an index.
// For example, adding a "2D sphere" index makes it possible 
// to easily find nearby points via MongoDB's $near query operator
// See also: https://mongoosejs.com/docs/geojson.html#geospatial-indexes
storySchema.index({ location: '2dsphere' }); 
 

export default  mongoose.model('Story', storySchema );
 