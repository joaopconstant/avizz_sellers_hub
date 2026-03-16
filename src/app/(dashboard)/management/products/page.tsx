import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { ProductsClient } from "@/components/products/products-client";

export default async function ProductsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.role !== "admin") {
    redirect("/unauthorized");
  }

  return <ProductsClient />;
}
