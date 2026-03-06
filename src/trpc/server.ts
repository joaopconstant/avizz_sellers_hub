import "server-only";
import { createCallerFactory, createTRPCContext } from "@/server/trpc";
import { appRouter } from "@/server/routers/_app";
import { headers } from "next/headers";
import { cache } from "react";

const createCaller = createCallerFactory(appRouter);

const createContext = cache(async () => {
  const heads = await headers();
  return createTRPCContext({ headers: heads });
});

export const api = createCaller(createContext);
