export const PRODUCT_CATEGORY_OPTIONS = [
  { label: "Food & Beverage (FOD)", value: "FOD" },
  { label: "Electronics (ELE)", value: "ELE" },
  { label: "Clothing (CLT)", value: "CLT" },
  { label: "Pharmaceutical (PHA)", value: "PHA" },
  { label: "Construction (CNS)", value: "CNS" },
] as const;

export const PRODUCT_UNIT_OPTIONS = [
  { label: "Pieces (Pcs)", value: "Pcs" },
  { label: "Pack", value: "Pack" },
  { label: "Box", value: "Box" },
  { label: "Carton", value: "Carton" },
  { label: "Kilogram (kg)", value: "Kilogram" },
  { label: "Gram (g)", value: "Gram" },
  { label: "Liter (l)", value: "Liter" },
  { label: "Milliliter (ml)", value: "Milliliter" },
  { label: "Set", value: "Set" },
  { label: "Bottle", value: "Bottle" },
  { label: "Bag", value: "Bag" },
] as const;

export const PRODUCT_SIZE_OPTIONS = [
  { label: "S", value: "S" },
  { label: "M", value: "M" },
  { label: "L", value: "L" },
  { label: "XL", value: "XL" },
  { label: "2XL", value: "TwoXL" },
  { label: "3XL", value: "ThreeXL" },
] as const;

export const PRODUCT_VARIANT_FIELDS = [
  { key: "color", label: "Color", placeholder: "Black" },
  { key: "storage", label: "Storage", placeholder: "128GB" },
  { key: "size", label: "Size", placeholder: "Select size" },
  { key: "dosage", label: "Dosage", placeholder: "500MG" },
  { key: "grade", label: "Grade", placeholder: "Grade A" },
  { key: "finish", label: "Finish", placeholder: "Gloss" },
] as const;

export type ProductVariantFieldKey =
  (typeof PRODUCT_VARIANT_FIELDS)[number]["key"];

export type ProductUnitValue = (typeof PRODUCT_UNIT_OPTIONS)[number]["value"];
export type ProductSizeValue = (typeof PRODUCT_SIZE_OPTIONS)[number]["value"];
