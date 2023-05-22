const mongoose = require("mongoose");
const request = require("supertest");
const { app, server } = require('../server')
require("dotenv").config();
const Guard = require('../models/guard')
const Contract = require('../models/contract')
const Schedule = require('../models/schedule');


beforeAll(async () => {
    await mongoose.connect(process.env.DB_URL, {family: 4})
    const db = mongoose.connection
    db.on('error', (error) => console.log(error))
    db.once('connected', () => console.log('Connected to DB'))
});

describe("POST /guard", () => {
    it("should create a new guard document", async () => {
      const firstGuard = { name: "Deb", hasArmedGuardCredential: true };
      let res = await request(app).post("/guard").send(firstGuard);
      expect(res.statusCode).toBe(201);
      expect(res.body).toMatchObject(firstGuard);

      const secondGuard = { name: "Dhruv", hasArmedGuardCredential: false };
      res = await request(app).post("/guard").send(secondGuard);
      expect(res.statusCode).toBe(201);
      expect(res.body).toMatchObject(secondGuard);
    });
});

describe("GET /guard", () => {
    it("should fetch all guard documents", async () => {
        const res = await request(app).get("/guard");
        expect(res.statusCode).toBe(200);
        expect(res.body.length).toBe(2);
    });
});

describe("POST /contract", () => {
    it("should create a new contract document", async () => {
      const contract = {
        name: "Sheraton",
        requiresArmedGuardCredential: false,
        daysOfWeek: ["Wednesday", "Thursday"],
        renewalDuration: 14
      };
      const res = await request(app).post("/contract").send(contract);
      expect(res.statusCode).toBe(201);
      expect(res.body).toMatchObject(contract);
    });

    it("should create the datesOfMonth field on contract document", async () => {
        const datesOfMonth = [
            "Wednesday, 5/24/2023",
            "Thursday, 5/25/2023",
            "Wednesday, 5/31/2023",
            "Thursday, 6/1/2023"
          ]
        const res = await request(app).get("/contract")
        expect(res.body[0].datesOfMonth).toEqual(datesOfMonth)
    })

    it("should create entries in the Schedule model", async () => {
        const res = await request(app).get("/schedule")
        expect(res.statusCode).toBe(200);
        expect(res.body.length).toBe(4);
        expect(res.body).toEqual([
            {
              "contract": {
                "name": "Sheraton"
              },
              "guard": {
                "name": "Deb"
              },
              "day": "2023-05-24T04:00:00.000Z"
            },
            {
              "contract": {
                "name": "Sheraton"
              },
              "guard": {
                "name": "Dhruv"
              },
              "day": "2023-05-25T04:00:00.000Z"
            },
            {
              "contract": {
                "name": "Sheraton"
              },
              "guard": {
                "name": "Deb"
              },
              "day": "2023-05-31T04:00:00.000Z"
            },
            {
              "contract": {
                "name": "Sheraton"
              },
              "guard": {
                "name": "Dhruv"
              },
              "day": "2023-06-01T04:00:00.000Z"
            }
          ])
      });
    
    it("should evenly distribute dates of contract and hours of work between the guards", async () => {
        let res = await request(app).get("/guard")
        expect(res.body[0].daysOccupied).toEqual([
            "Wednesday, 5/24/2023",
            "Wednesday, 5/31/2023"            
          ])
        expect(res.body[0].hoursWorked).toBe(20)
        expect(res.body[1].daysOccupied).toEqual([
            "Thursday, 5/25/2023",
            "Thursday, 6/1/2023"            
          ])   
        expect(res.body[1].hoursWorked).toBe(20)     
    })

    it ("should assign shifts only to guards with armed credentials if the contract requires it", async () => {
          const contract = {
            name: "TheRitzNYC",
            requiresArmedGuardCredential: true,
            daysOfWeek: ["Friday", "Saturday"],
            renewalDuration: 7
          };
          await request(app).post("/contract").send(contract);
          const res = await request(app).get("/schedule")
          expect(res.body).toContainEqual({
            "contract": {
              "name": "TheRitzNYC"
            },
            "guard": {
              "name": "Deb"
            },
            "day": "2023-05-26T04:00:00.000Z"
        })
        expect(res.body).toContainEqual({
            "contract": {
              "name": "TheRitzNYC"
            },
            "guard": {
              "name": "Deb"
            },
            "day": "2023-05-27T04:00:00.000Z"
        })
    })

    it ("should throw an error if all qualified guards are occupied for contract dates", async () => {
        const contract = {
          name: "TheRitzNJ",
          requiresArmedGuardCredential: true,
          daysOfWeek: ["Friday", "Saturday"],
          renewalDuration: 7
        };
        res = await request(app).post("/contract").send(contract);
        console.log(res.body.message)
        expect(res.body.message).toBe("Not enough officers to cover this contract. Please appoint more officers")
    })
});

describe("PATCH /guard/:id with PTO body", () => {
    beforeEach(() => {
        this.ptoRequest = {
            pto: "6/1/2023"
        };
        this.ptoDate = new Date(this.ptoRequest.pto)
        this.ptoDateString = `${this.ptoDate.toLocaleDateString('en-US', { weekday: 'long' })}, ${this.ptoDate.getMonth() + 1}/${this.ptoDate.getDate()}/${this.ptoDate.getFullYear()}`;
    })    

    it("should add the pto date to the pto and daysOccupied fields", async () => {
        let guard = await Guard.findOne({name: {$eq: "Dhruv"}})
        await request(app).patch("/guard/" + guard._id).send(this.ptoRequest);

        guard = await Guard.findOne({name: {$eq: "Dhruv"}})
        expect(guard.daysOccupied).toContain(this.ptoDateString)
        expect(guard.pto).toContain(this.ptoDateString)
    })

    it("it should update schedule to utilize other guards to fill shifts on the day of pto", async () => {
        let otherGuard = await Guard.findOne({name: {$eq: "Deb"}})
        expect(otherGuard.daysOccupied).toContain(this.ptoDateString)
        const res = await request(app).get("/schedule")
        expect(res.body).toContainEqual({
            "contract": {
              "name": "Sheraton"
            },
            "guard": {
              "name": "Deb"
            },
            "day": "2023-06-01T04:00:00.000Z"
        })
        expect(res.body).not.toContainEqual({
            "contract": {
              "name": "Sheraton"
            },
            "guard": {
              "name": "Dhruv"
            },
            "day": "2023-06-01T04:00:00.000Z"
        })
    })
})

describe("GET /schedule", () => {
    it("should fetch all schedule entries when start and end are not provided", async () => {
        const res = await request(app).get("/schedule");
        expect(res.statusCode).toBe(200);
        console.log(res.body)
        expect(res.body.length).toBe(6);
        expect(res.body).toEqual([
            {
              contract: { name: 'Sheraton' },
              guard: { name: 'Deb' },
              day: '2023-05-24T04:00:00.000Z'
            },
            {
              contract: { name: 'Sheraton' },
              guard: { name: 'Dhruv' },
              day: '2023-05-25T04:00:00.000Z'
            },
            {
              contract: { name: 'TheRitzNYC' },
              guard: { name: 'Deb' },
              day: '2023-05-26T04:00:00.000Z'
            },
            {
              contract: { name: 'TheRitzNYC' },
              guard: { name: 'Deb' },
              day: '2023-05-27T04:00:00.000Z'
            },
            {
              contract: { name: 'Sheraton' },
              guard: { name: 'Deb' },
              day: '2023-05-31T04:00:00.000Z'
            },
            {
              contract: { name: 'Sheraton' },
              guard: { name: 'Deb' },
              day: '2023-06-01T04:00:00.000Z'
            }
          ])
    });
    it("should fetch schedule entries within start and end when start and end are provided", async () => {
        const res = await request(app).get("/schedule?start=05/25/2023&end=05/27/2023");
        expect(res.statusCode).toBe(200);
        console.log(res.body)
        expect(res.body.length).toBe(3);
        expect(res.body).toEqual([
            {
              contract: { name: 'Sheraton' },
              guard: { name: 'Dhruv' },
              day: '2023-05-25T04:00:00.000Z'
            },
            {
              contract: { name: 'TheRitzNYC' },
              guard: { name: 'Deb' },
              day: '2023-05-26T04:00:00.000Z'
            },
            {
              contract: { name: 'TheRitzNYC' },
              guard: { name: 'Deb' },
              day: '2023-05-27T04:00:00.000Z'
            }
          ])
    });
})

afterAll(async () => {
    await Guard.deleteMany()
    await Contract.deleteMany()
    await Schedule.deleteMany()
    await mongoose.connection.close();
    server.close()
});