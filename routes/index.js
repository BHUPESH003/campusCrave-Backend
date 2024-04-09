const express=require('express')
const userRouter = require('./user')
const {vendorRouter}=require('./vendor')
const categoriesRouter = require('./categories');
const {orders} = require('./Orders');


const rootRouter = express.Router();

rootRouter.use("/user", userRouter);
rootRouter.use("/vendor", vendorRouter);
rootRouter.use("/categories",categoriesRouter);
rootRouter.use("/orders",orders);



module.exports=rootRouter;