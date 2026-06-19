// Catálogo do cardápio Top Burguer
import topClassic from "@/assets/menu/top-classic.jpg";
import topBacon from "@/assets/menu/top-bacon.jpg";
import topCheddar from "@/assets/menu/top-cheddar.jpg";
import topVeggie from "@/assets/menu/top-veggie.jpg";
import fries from "@/assets/menu/fries.jpg";
import onionRings from "@/assets/menu/onion-rings.jpg";
import nuggets from "@/assets/menu/nuggets.jpg";
import cola from "@/assets/menu/cola.jpg";
import juice from "@/assets/menu/juice.jpg";
import milkshake from "@/assets/menu/milkshake.jpg";

export type MenuItem = {
  id: string;
  name: string;
  price: number;
  category: "burger" | "side" | "drink";
  description?: string;
  emoji: string;
  image: string;
  badges?: string[];
  prepMinutes?: number;
};

export const MENU: MenuItem[] = [
  { id: "b1", name: "Top Classic", price: 28, category: "burger", emoji: "🍔", image: topClassic, description: "Pão brioche, blend 160g, queijo, alface, tomate" },
  { id: "b2", name: "Top Bacon", price: 34, category: "burger", emoji: "🥓", image: topBacon, description: "Blend 160g, bacon crocante, cheddar, cebola caramelizada" },
  { id: "b3", name: "Top Cheddar Duplo", price: 38, category: "burger", emoji: "🧀", image: topCheddar, description: "Dois blends, cheddar duplo, picles" },
  { id: "b4", name: "Top Veggie", price: 30, category: "burger", emoji: "🥬", image: topVeggie, description: "Burger de grão de bico, rúcula, tomate seco" },
  { id: "s1", name: "Batata Frita", price: 18, category: "side", emoji: "🍟", image: fries },
  { id: "s2", name: "Onion Rings", price: 20, category: "side", emoji: "🧅", image: onionRings },
  { id: "s3", name: "Nuggets (8un)", price: 22, category: "side", emoji: "🍗", image: nuggets },
  { id: "d1", name: "Coca-Cola 350ml", price: 8, category: "drink", emoji: "🥤", image: cola },
  { id: "d2", name: "Suco Natural", price: 10, category: "drink", emoji: "🧃", image: juice },
  { id: "d3", name: "Milk Shake", price: 16, category: "drink", emoji: "🥛", image: milkshake },
];
