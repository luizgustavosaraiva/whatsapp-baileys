import axios from 'axios';
import fs from 'fs';
const ITEMS_PER_PAGE = 100;
let items = [];

type Product = {
  id: string;
  name: string;
  price: number;
  promotional_price: number;
  store: {
    id: string;
    name: string;
    slug: string;
  };
};

export async function getIfoodPromotion(
  location: { lat: string | null | undefined; lon: string | null | undefined },
  term: string
) {
  items = [];
  const { data } = await axios.get(
    `https://marketplace.ifood.com.br/v2/search/catalog-items?latitude=${location.lat}&longitude=${location.lon}&channel=IFOOD&term=${term}&size=${ITEMS_PER_PAGE}&page=0`
  );

  if (data?.items?.total && data?.items?.total > 0) {
    for (let i = 0; i < Math.ceil(data.items.total / ITEMS_PER_PAGE); i++) {
      const { data: itemsCollection } = await axios.get(
        `https://marketplace.ifood.com.br/v2/search/catalog-items?latitude=${location.lat}&longitude=${location.lon}&channel=IFOOD&term=${term}&size=${ITEMS_PER_PAGE}&page=${i}`
      );
      items.push(...itemsCollection.items.data);
    }

    const filtered: Product[] = items
      .filter((i) => i.originalPrice && i.price > 0)
      .map((item) => {
        return {
          id: item.id,
          name: item.name,
          price: Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
          }).format(item.originalPrice),
          promotional_price: Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,            
          }).format(item.price),
          store: {
            id: item.merchant.id,
            name: item.merchant.name,
            slug: item.merchant.slug,
          },
        };
      });

    // fs.writeFileSync(
    //   __dirname + '/promotional_itens.json',
    //   JSON.stringify(filtered, null, '\t')
    // ); // save this info to a file

    return filtered;
  }
}

export function renderPromoFood(products: Product[] | undefined) {
  return products?.map((p) => {
    return {
      message:
        `*Loja:* ${p.store.name}\n` +
        `*Produto:* ${p.name}\n` +
        `*Preço:* ${p.price}\n` +
        `*Preço Promocional:* ${p.promotional_price}\n` +
        `*Link:* https://www.ifood.com.br/delivery/${p.store.slug}/${p.store.id}?prato=${p.id}`,
    };
  });
}
