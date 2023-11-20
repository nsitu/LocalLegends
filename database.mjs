// This  module defines and exports a database connection to MongoDB

// import mongoose
// see also: https://mongoosejs.com/
import mongoose from 'mongoose'

/* Connect to MongoDB:
To connect, you must add a MongoDB connection string
as an environment variable (i.e. Replit "Secret")
The name/key of the environment variable must be "MONGODB"
The value of the variable must be a valid MongoDB connection string. 
You can locate the string in your MongoDB Atlas dashboard.
See also: https://account.mongodb.com/account/login  
See also: https://mongoosejs.com/docs/connections.html */ 
export default mongoose.connect( process.env.MONGODB )
  .then(mongoose => {  
    // show connection status
    console.log(`Mongoose ${mongoose.version} connected to MongoDB Atlas.`)
    console.log(`Host: ${mongoose.connection.host}`)
  })
  .catch(error => handleError(error));

// Error Handler for MongoDB:
// If there are any issues with MongoDB, 
// we will log them to the console. 
const handleError = (error)=>{
  console.log("MongoDB connection failed.")
  console.log(error.message)
  if (process.env.MONGODB){
    console.log("MONGODB="+process.env.MONGODB) 
  }    
  else{
    console.log("MONGODB environment variable not found.") 
  }
}