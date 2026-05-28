// Catálogo do cardápio Top Burguer
export type MenuItem = {
  id: string;
  name: string;
  price: number;
  category: "burger" | "side" | "drink";
  description?: string;
  emoji: string;
};

export const MENU: MenuItem[] = [
  { id: "b1", name: "Top Classic", price: 28, category: "burger", emoji: "🍔", description: "Pão brioche, blend 160g, queijo, alface, tomate" },
  { id: "b2", name: "Top Bacon", price: 34, category: "burger", emoji: "🥓", description: "Blend 160g, bacon crocante, cheddar, cebola caramelizada" },
  { id: "b3", name: "Top Cheddar Duplo", price: 38, category: "burger", emoji: "🧀", description: "Dois blends, cheddar duplo, picles" },
  { id: "b4", name: "Top Veggie", price: 30, category: "burger", emoji: "🥬", description: "Burger de grão de bico, rúcula, tomate seco" },
  { id: "s1", name: "Batata Frita", price: 18, category: "side", emoji: "🍟" },
  { id: "s2", name: "Onion Rings", price: 20, category: "side", emoji: "🧅" },
  { id: "s3", name: "Nuggets (8un)", price: 22, category: "side", emoji: "🍗" },
  { id: "d1", name: "Coca-Cola 350ml", price: 8, category: "drink", emoji: "🥤" },
  { id: "d2", name: "Suco Natural", price: 10, category: "drink", emoji: "🧃" },
  { id: "d3", name: "Milk Shake", price: 16, category: "drink", emoji: "🥛" },
];
