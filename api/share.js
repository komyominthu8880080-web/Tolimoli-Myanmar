export default async function handler(req, res) {
  const RTDB_URL = "https://tolimoli-myanmar-default-rtdb.asia-southeast1.firebasedatabase.app/shop_products.json";
  try {
    const response = await fetch(RTDB_URL);
    const rawData = await response.json();
    
    let list = Array.isArray(rawData) ? rawData : Object.values(rawData || {});
    if (rawData && rawData.products) list = Object.values(rawData.products);

    // နမူနာ ပစ္စည်း ၃ ခုရဲ့ data ဖွဲ့စည်းပုံကို တိုက်ရိုက် output ထုတ်ပြမည်
    return res.status(200).json({
      totalCount: list.length,
      sampleFirstItem: list[0] || null,
      samplePumpItem: list.find(p => JSON.stringify(p).toLowerCase().includes('pump') || JSON.stringify(p).includes('ကျင့်ပြောင်း')) || "NOT_FOUND"
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}