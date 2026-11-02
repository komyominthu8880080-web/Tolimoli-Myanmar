export default async function handler(req, res) {
  const { cat } = req.query;
  const RTDB_URL = "https://tolimoli-myanmar-default-rtdb.asia-southeast1.firebasedatabase.app/shop_products.json";

  try {
    const response = await fetch(RTDB_URL);
    const rawData = await response.json();
    let productsList = Array.isArray(rawData) ? rawData : Object.values(rawData || {});
    if (rawData && rawData.products) productsList = Object.values(rawData.products);

    // Pump သို့မဟုတ် ကျင့်ပြောင်း ပါဝင်သော ပစ္စည်းအားလုံးကို စစ်ထုတ်ခြင်း
    const matchedProducts = productsList.filter(p => {
      const str = JSON.stringify(p);
      return str.includes("ကျင့်ပြောင်း") || str.toLowerCase().includes("pump");
    });

    return res.status(200).json({
      queryCat: cat,
      totalDatabaseItems: productsList.length,
      matchedCount: matchedProducts.length,
      firstMatchedProduct: matchedProducts[0] || null
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}