import * as z from "zod"
import {tool} from "@langchain/core/tools"
import fs from "node:fs/promises";


export const totalSalesTool = tool(
    async () => {
        const rawData = await fs.readFile("./data/sales.json", "utf-8");
        const salesData = JSON.parse(rawData);

        // 2️⃣ Total sales calculate karo
        const total = salesData.reduce((sum, item) => {
        return sum + Number(item["Sales"]);
        }, 0);

        // 3️⃣ Result return karo
        return `Total sales is ${total}`;
    },
    {
        name: "total_sales",
        description: "Calculate total sales from the sales dataset",
        schema: z.object({})
    }
)