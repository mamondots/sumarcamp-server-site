const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())




const uri = `mongodb+srv://${process.env.BD_USER}:${process.env.BD_PASSWORD}@cluster0.i6scrno.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
 
    await client.connect();


    const classesCollection = client.db('SummerCamp').collection('Classes')
    const instructorCollection = client.db('SummerCamp').collection('Instructors')

    app.get('/classes', async(req, res) =>{
        const result = await classesCollection.find().toArray()
        res.send(result)
    })

    app.get('/instructors', async(req, res) =>{
        const result = await instructorCollection.find().toArray()
        res.send(result)
    })


    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
 
    //await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) =>{
    res.send('summer comp is running')
})

app.listen(port, () =>{
    console.log(`summer comp is running on port, ${port}`)
})