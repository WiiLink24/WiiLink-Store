import * as contentful from "contentful";
import { type Entry, type EntryFieldTypes } from "contentful";

export interface storeProduct {
  contentTypeId: "storeProduct";
  fields: {
    productName: EntryFieldTypes.Text;
    description: EntryFieldTypes.RichText;
    classificationChips: EntryFieldTypes.Array<EntryFieldTypes.Text>;
    images: EntryFieldTypes.Array<EntryFieldTypes.Asset>;
    priceUsd: EntryFieldTypes.Number;
  };
}

export const contentfulClient = contentful.createClient({
  space: import.meta.env.CONTENTFUL_SPACE_ID,
  accessToken: import.meta.env.DEV
    ? import.meta.env.CONTENTFUL_PREVIEW_TOKEN
    : import.meta.env.CONTENTFUL_DELIVERY_TOKEN,
  host: import.meta.env.DEV ? "preview.contentful.com" : "cdn.contentful.com",
});

export async function getStoreProducts() {
  const products = await contentfulClient.getEntries({ content_type: 'storeProduct' });
  return products.items.map((product) => ({
    productName: product.fields.productName,
    description: product.fields.description,
    classificationChips: product.fields.classificationChips,
    images: product.fields.images,
    priceUsd: product.fields.priceUsd,
  }));
}