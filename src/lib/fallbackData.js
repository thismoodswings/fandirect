export const fallbackCreators = [
  {
    id: "demo-creator-1",
    name: "FanDirect Creator",
    username: "fandirectcreator",
    handle: "@fandirectcreator",
    slug: "fandirectcreator",
    category: "Music",
    bio: "Exclusive drops, merch, events, and fan experiences.",
    avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80",
    cover_image_url: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1200&auto=format&fit=crop&q=80",
    verified: true,
    followers: 12500,
    rating: 4.9,
    total_sales: 0,
    created_at: new Date().toISOString(),
  },
];

export const fallbackProducts = [
  {
    id: "demo-product-1",
    creator_id: "demo-creator-1",
    creator_name: "FanDirect Creator",
    name: "Exclusive Fan Merch Drop",
    title: "Exclusive Fan Merch Drop",
    description: "A limited FanDirect product drop for fans.",
    price: 49.99,
    compare_at_price: 69.99,
    image_url: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&auto=format&fit=crop&q=80",
    type: "merch",
    status: "active",
    is_limited: true,
    inventory: 100,
    tags: ["merch", "exclusive", "limited"],
    created_at: new Date().toISOString(),
  },
];