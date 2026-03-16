"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { api } from "@/trpc/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ProductItem } from "./product-modal";

// Dialogs are loaded on demand — not needed in the initial bundle
const ProductModal = dynamic(
  () => import("./product-modal").then((m) => m.ProductModal),
  { ssr: false },
);
const ProductAuditLogModal = dynamic(
  () => import("./product-audit-log-modal").then((m) => m.ProductAuditLogModal),
  { ssr: false },
);
// Gateways tab is not the default tab — defer its load
const GatewaysSection = dynamic(
  () => import("./gateways-section").then((m) => m.GatewaysSection),
  { ssr: false },
);
import {
  Package,
  ChevronUp,
  ChevronDown,
  Pencil,
  History,
} from "lucide-react";

export function ProductsClient() {
  const {
    data: productsData,
    isLoading: productsLoading,
    refetch: refetchProducts,
  } = api.products.listAll.useQuery();

  const {
    data: gatewaysData,
    isLoading: gatewaysLoading,
    refetch: refetchGateways,
  } = api.gateways.listAll.useQuery();

  const [orderedProducts, setOrderedProducts] = useState<ProductItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [auditProductId, setAuditProductId] = useState<string | null>(null);
  const [auditProductName, setAuditProductName] = useState<string | undefined>();

  useEffect(() => {
    if (productsData) {
      setOrderedProducts(productsData as ProductItem[]);
    }
  }, [productsData]);

  const reorderMutation = api.products.reorder.useMutation();

  const toggleActiveMutation = api.products.update.useMutation({
    onSuccess: () => void refetchProducts(),
  });

  function moveProduct(index: number, direction: -1 | 1) {
    const newArr = [...orderedProducts];
    const swap = index + direction;
    if (swap < 0 || swap >= newArr.length) return;
    [newArr[index], newArr[swap]] = [newArr[swap]!, newArr[index]!];
    setOrderedProducts(newArr);
    reorderMutation.mutate({ orderedIds: newArr.map((p) => p.id) });
  }

  function handleToggleActive(product: ProductItem) {
    toggleActiveMutation.mutate({
      id: product.id,
      name: product.name,
      description: product.description,
      is_active: !product.is_active,
      counts_as_sale: product.counts_as_sale,
      is_primary: product.is_primary,
      sort_order: product.sort_order,
    });
  }

  function openCreate() {
    setEditingProduct(null);
    setModalOpen(true);
  }

  function openEdit(product: ProductItem) {
    setEditingProduct(product);
    setModalOpen(true);
  }

  function openAudit(product: ProductItem) {
    setAuditProductId(product.id);
    setAuditProductName(product.name);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Package className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Gestão de Produtos
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Gerencie produtos, configurações de gateways e taxas de parcelamento
          </p>
        </div>
      </div>

      <Tabs defaultValue="products" className="space-y-0">
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="border-b px-6 pt-4">
            <TabsList
              variant="line"
              className="gap-0 bg-transparent h-auto p-0 rounded-none"
            >
              <TabsTrigger
                value="products"
                className="rounded-none px-3 pb-3 pt-0 text-sm"
              >
                Produtos
              </TabsTrigger>
              <TabsTrigger
                value="gateways"
                className="rounded-none px-3 pb-3 pt-0 text-sm"
              >
                Gateways
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── Aba Produtos ──────────────────────────────────────────────── */}
          <TabsContent value="products" className="p-6 mt-0 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {orderedProducts.length === 0
                  ? "Nenhum produto cadastrado"
                  : `${orderedProducts.length} produto${orderedProducts.length !== 1 ? "s" : ""}`}
              </p>
              <Button size="sm" onClick={openCreate} className="gap-1.5">
                + Novo Produto
              </Button>
            </div>

            {productsLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Carregando...
              </div>
            ) : orderedProducts.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Nenhum produto cadastrado.
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                      <th className="py-2.5 px-3 text-left w-16">Ordem</th>
                      <th className="py-2.5 px-3 text-left">Nome</th>
                      <th className="py-2.5 px-3 text-center">
                        Conta como Venda
                      </th>
                      <th className="py-2.5 px-3 text-center">Principal</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderedProducts.map((product, index) => (
                      <tr
                        key={product.id}
                        className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                      >
                        <td className="py-2.5 px-3">
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={() => moveProduct(index, -1)}
                              disabled={index === 0}
                              className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                moveProduct(index, 1)
                              }
                              disabled={
                                index === orderedProducts.length - 1
                              }
                              className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-medium">{product.name}</span>
                          {product.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">
                              {product.description}
                            </p>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge
                            variant={
                              product.counts_as_sale ? "default" : "secondary"
                            }
                            className="text-xs"
                          >
                            {product.counts_as_sale ? "Sim" : "Não"}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {product.is_primary ? (
                            <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-200">
                              Principal
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleToggleActive(product)}
                            disabled={toggleActiveMutation.isPending}
                            className="text-xs"
                          >
                            <Badge
                              variant={
                                product.is_active ? "default" : "secondary"
                              }
                              className="cursor-pointer text-xs hover:opacity-80 transition-opacity"
                            >
                              {product.is_active ? "Ativo" : "Inativo"}
                            </Badge>
                          </button>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => openEdit(product)}
                              title="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => openAudit(product)}
                              title="Histórico"
                            >
                              <History className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ── Aba Gateways ─────────────────────────────────────────────── */}
          <TabsContent value="gateways" className="p-6 mt-0">
            <GatewaysSection
              gateways={gatewaysData ?? []}
              isLoading={gatewaysLoading}
              onRefetch={() => void refetchGateways()}
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* Modais */}
      <ProductModal
        key={editingProduct?.id ?? "new"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          void refetchProducts();
        }}
        existing={editingProduct}
        nextSortOrder={orderedProducts.length}
      />

      <ProductAuditLogModal
        productId={auditProductId}
        productName={auditProductName}
        open={!!auditProductId}
        onClose={() => {
          setAuditProductId(null);
          setAuditProductName(undefined);
        }}
      />
    </div>
  );
}
