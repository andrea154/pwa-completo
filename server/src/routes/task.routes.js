import {Router} from "express";
import {auth} from "../middleware/auth.js";
import {list, create, update, remove, bulksync} from "../controllers/task.controller.js";

const router = Router();
router.use(auth);
router.get("/", list);
router.post("/", create);
router.post("/bulksync", bulksync); 
router.put("/:id", update);
router.delete("/:id", remove);


export default router;

