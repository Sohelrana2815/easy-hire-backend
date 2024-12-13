const express = require("express");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();

// Middleware
app.use(express.json());

app.use(cors());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5q2fm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const jobsCollection = client.db("EASY_HIRE_DB").collection("jobs");
    const myPostedJobsCollection = client
      .db("EASY_HIRE_DB")
      .collection("myPostedJobs");
    app.get("/jobs", async (req, res) => {
      const result = await jobsCollection.find().toArray();
      res.send(result);
    });

    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await jobsCollection.findOne(filter);
      res.send(result);
    });

    app.post("/myPostedJobs", async (req, res) => {
      const job = req.body;
      console.log(job);

      const result = await myPostedJobsCollection.insertOne(job);
      res.send(result);
    });

    app.get("/myPostedJobs", async (req, res) => {
      const result = await myPostedJobsCollection.find().toArray();
      res.send(result);
    });

    app.get("/myPostedJobs/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await myPostedJobsCollection.findOne(filter);
      res.send(result);
    });
    app.patch("/myPostedJobs/:id", async (req, res) => {
      const id = req.params.id;
      const myPostedJob = req.body;
      console.log(myPostedJob, id);

      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          jobTitle: myPostedJob.jobTitle,
          deadline: myPostedJob.deadline,
          description: myPostedJob.description,
          category: myPostedJob.category,
          minimumPrice: myPostedJob.minimumPrice,
          maximumPrice: myPostedJob.maximumPrice,
        },
      };

      const result = await myPostedJobsCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.delete("/myPostedJobs/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await myPostedJobsCollection.deleteOne(filter);
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Job Portal is Running....");
});

app.listen(port, () => {
  console.log(`Job Portal is Running on port ${port}`);
});
