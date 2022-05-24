const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ynxrlo3.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {

  try {
    await client.connect();
    const toolCollection = client.db('screw_driver').collection('tools');
    const orderCollection = client.db('screw_driver').collection('orders');
    const userCollection = client.db('screw_driver').collection('users');

    app.get('/tool', async (req, res) => {
      const query = {};
      const cursor = toolCollection.find(query);
      const tools = await cursor.toArray();
      res.send(tools);
    });

    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    app.get('/tool/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const tool = await toolCollection.findOne(query);
      res.send(tool);
    });

    app.get('/order', async (req, res) => {
      const customer = req.query.userEmail;
      const query = { userEmail: customer };
      const orders = await orderCollection.find(query).toArray();
      res.send(orders);
    });

    app.post('/order', async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      return res.send({ success: true, result });
    })

  }
  finally {

  }

}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello from Screw Driver')
})

app.listen(port, () => {
  console.log(`Screw Driver app listening on port ${port}`)
})