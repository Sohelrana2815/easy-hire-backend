const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const port = process.env.PORT || 5000;

// Middleware

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://easy-hire-e14d3.web.app",
      "https://easy-hire-e14d3.firebaseapp.com",
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
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

// Middleware

const verifyToken = async (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "Unauthorized" });
  }

  jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized Access Error" });
    }
    req.decoded = decoded;
    next();
  });
};

// Cookie options

const cookieOption = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  secure: process.env.NODE_ENV === "production" ? true : false,
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const usersPostedJobsCollection = client
      .db("EASY_HIRE_DB")
      .collection("usersPostedJobs");
    const bidedJobsCollection = client
      .db("EASY_HIRE_DB")
      .collection("bidedJobs");

    // JWT RELATED API'S

    app.post("/jwt", async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res.cookie("token", token, cookieOption).send({ success: true });
    });

    // CLEAR COOKIE

    app.post("/clearCookie", async (req, res) => {
      res
        .clearCookie("token", { ...cookieOption, maxAge: 0 })
        .send({ success: true });
    });

    // USER RELATED API'S
    app.post("/usersPostedJobs", async (req, res) => {
      const job = req.body;
      const result = await usersPostedJobsCollection.insertOne(job);
      res.send(result);
    });

    app.get("/allUsersJobs", async (req, res) => {
      const result = await usersPostedJobsCollection.find().toArray();
      res.send(result);
    });
    app.get("/allUsersJobs/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await usersPostedJobsCollection.findOne(filter);
      res.send(result);
    });

    app.get("/myPostedJobs", verifyToken, async (req, res) => {
      if (req.query?.email !== req.decoded?.email) {
        return res.status(403).send({ message: "Forbidden Access!" });
      }
      const email = req.query?.email;
      const filter = { email };
      const result = await usersPostedJobsCollection.find(filter).toArray();
      res.send(result);
    });

    app.get("/myPostedJobs/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await usersPostedJobsCollection.findOne(filter);
      res.send(result);
    });

    app.patch("/myPostedJobs/:id", async (req, res) => {
      const id = req.params.id;
      const myPostedJob = req.body;
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

      const result = await usersPostedJobsCollection.updateOne(
        filter,
        updatedDoc
      );
      res.send(result);
    });

    app.delete("/myPostedJobs/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await usersPostedJobsCollection.deleteOne(filter);
      res.send(result);
    });

    // Bid job related api's

    app.post("/bidedJobs", verifyToken, async (req, res) => {
      const myBidedJob = req.body;
      const result = await bidedJobsCollection.insertOne(myBidedJob);
      res.send(result);
    });

    app.get("/myBidJobs", verifyToken, async (req, res) => {
      const { email, sort } = req.query;
      const query = { email };

      let options = {};

      if (sort === "asc") {
        options.sort = { status: 1 };
      } else if (sort === "desc") {
        options.sort = { status: -1 };
      }

      const result = await bidedJobsCollection.find(query, options).toArray();
      res.send(result);
    });

    app.get("/bidRequests", verifyToken, async (req, res) => {
      const jobOwnerEmail = req.query?.email;
      const filter = { jobOwnerEmail };
      const result = await bidedJobsCollection.find(filter).toArray();
      res.send(result);
    });

    app.get("/bidRequests/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await bidedJobsCollection.findOne(filter).toArray();
      res.send(result);
    });

    app.patch("/cancelBidRequest/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };

      const updatedDoc = {
        $set: {
          status: "reject",
        },
      };
      const result = await bidedJobsCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.patch("/acceptBidRequest/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: "accept",
        },
      };

      const result = await bidedJobsCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.patch("/completeProject/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: "complete",
        },
      };

      const result = await bidedJobsCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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
