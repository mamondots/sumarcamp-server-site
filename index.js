const express = require('express')
const cors = require('cors')
var jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { send } = require('express/lib/response');
require('dotenv').config()
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY);
const app = express()
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())


const verifyJWT = (req,res,next) =>{
  const authorization = req.headers.authorization
  if(!authorization){
    return res.status(401).send({error:true, message:'unauthorized access'})
  }
  const token = authorization.split(' ')[1]

  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err, decoded)=>{
    if(err){
      return res.status(401).send({error:true, message:'unauthorized access'})
    }
    req.decoded = decoded
    next()
  })
}


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


    const usersCollection = client.db('SummerCamp').collection('users')
    const classesCollection = client.db('SummerCamp').collection('Classes')
    const seletedCollection = client.db('SummerCamp').collection('seleted')
    const instructorCollection = client.db('SummerCamp').collection('Instructors')
    const feedbacksCollection = client.db('SummerCamp').collection('feedbacks')



    //JWT

    app.post('/jwt', (req,res) =>{
      const user = req.body
      const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{
        expiresIn:'1h'
      })
      res.send({ token })
    })


    //for user

    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result)
    })

    app.post('/users', async (req, res) => {
      const user = req.body
      console.log(user)
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'User Already Have!' })
      }
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      }
      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          role: 'instructor'
        },
      }
      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await usersCollection.deleteOne(query)
      res.send(result)
    })

    //for classes
    app.get('/classes', async (req, res) => {
      const query = {}
      const options = {
        sort: { "available_seats": -1 }
      }
      const result = await classesCollection.find(query, options).toArray()
      res.send(result)
    })

    app.get('/classes/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await classesCollection.findOne(query)
      res.send(result)
    })

    app.post('/classes', async (req, res) => {
      const newItem = req.body
      const result = await classesCollection.insertOne(newItem)
      res.send(result)
    })

    app.delete('/classes/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await classesCollection.deleteOne(query)
      res.send(result)
    })

    app.patch('/classes/Approve/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          status: 'Approveed'
        },
      }
      const result = await classesCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    app.patch('/classes/delay/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          status: 'denied'
        },
      }
      const result = await classesCollection.updateOne(filter, updateDoc)
      res.send(result)
    })





    //feedback

    app.get('/feedbacks', async (req, res) => {
      const result = await feedbacksCollection.find().toArray()
      res.send(result)
    })

    app.post('/feedbacks', async (req, res) => {
      const feedback = req.body
      const result = await feedbacksCollection.insertOne(feedback)
      res.send(result)
    })

    app.get('/feedbacks/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await feedbacksCollection.findOne(query)
      res.send(result)
    })

    //seletedclasses

    app.get('/seleted', async (req, res) => {
      const email = req.query.email
      if (!email) {
        res.send([])
      }
      const query = { email: email }
      const result = await seletedCollection.find(query).toArray()
      res.send(result)
    })

    app.post('/seleted', async (req, res) => {
      const seletedItem = req.body
      const result = await seletedCollection.insertOne(seletedItem)
      res.send(result)
    })

    app.delete('/seleted/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await seletedCollection.deleteOne(query)
      res.send(result)
    })


    app.get('/instructors', async (req, res) => {
      const result = await instructorCollection.find().toArray()
      res.send(result)
    })

    //PAYMENT

    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = price*100

     
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_type:['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });


    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

    //await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('summer comp is running')
})

app.listen(port, () => {
  console.log(`summer comp is running on port, ${port}`)
})