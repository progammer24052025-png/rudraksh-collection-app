export const categories = [
  { id: 'men', name: 'Men', image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=400&h=500&fit=crop' },
  { id: 'women', name: 'Women', image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=500&fit=crop' },
  { id: 'kids', name: 'Kids', image: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=400&h=500&fit=crop' },
];

export const subCategories = [
  { id: 'tops', name: 'Tops', parentId: 'men' },
  { id: 'bottoms', name: 'Bottoms', parentId: 'men' },
  { id: 'ethnic', name: 'Ethnic Wear', parentId: 'men' },
  { id: 'casual', name: 'Casual', parentId: 'men' },
  { id: 'formal', name: 'Formal', parentId: 'men' },
  { id: 'tops-w', name: 'Tops', parentId: 'women' },
  { id: 'bottoms-w', name: 'Bottoms', parentId: 'women' },
  { id: 'ethnic-w', name: 'Ethnic Wear', parentId: 'women' },
  { id: 'casual-w', name: 'Casual', parentId: 'women' },
  { id: 'formal-w', name: 'Formal', parentId: 'women' },
  { id: 'boys', name: 'Boys', parentId: 'kids' },
  { id: 'girls', name: 'Girls', parentId: 'kids' },
];

export type Product = {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  discount: number;
  image: string;
  images: string[];
  category: string;
  subCategory: string;
  sizes: string[];
  colors: { name: string; hex: string }[];
  fabric: string;
  description: string;
  inStock: boolean;
  rating: number;
  reviews: number;
  isTrending?: boolean;
  isBudgetPick?: boolean;
  isNew?: boolean;
};

export const products: Product[] = [
  {
    id: '1',
    name: 'Premium Cotton Kurta Set',
    price: 1499,
    originalPrice: 2499,
    discount: 40,
    image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=500&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&h=1000&fit=crop',
    ],
    category: 'men',
    subCategory: 'ethnic',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: [{ name: 'White', hex: '#FFFFFF' }, { name: 'Navy', hex: '#1a365d' }],
    fabric: 'Cotton',
    description: 'Elegant cotton kurta set perfect for festivals and casual occasions.',
    inStock: true,
    rating: 4.5,
    reviews: 234,
    isTrending: true,
  },
  {
    id: '2',
    name: 'Embroidered Anarkali Suit',
    price: 2299,
    originalPrice: 3999,
    discount: 42,
    image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400&h=500&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=800&h=1000&fit=crop',
    ],
    category: 'women',
    subCategory: 'ethnic-w',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [{ name: 'Maroon', hex: '#800020' }, { name: 'Green', hex: '#228B22' }],
    fabric: 'Georgette',
    description: 'Beautiful embroidered anarkali suit with intricate detailing.',
    inStock: true,
    rating: 4.8,
    reviews: 156,
    isTrending: true,
  },
  {
    id: '3',
    name: 'Casual Denim Jacket',
    price: 999,
    originalPrice: 1799,
    discount: 44,
    image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=400&h=500&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800&h=1000&fit=crop',
    ],
    category: 'men',
    subCategory: 'casual',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [{ name: 'Blue', hex: '#4169E1' }, { name: 'Black', hex: '#000000' }],
    fabric: 'Denim',
    description: 'Classic denim jacket for everyday casual wear.',
    inStock: true,
    rating: 4.3,
    reviews: 89,
    isBudgetPick: true,
  },
  {
    id: '4',
    name: 'Floral Print Saree',
    price: 1799,
    originalPrice: 2999,
    discount: 40,
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&h=500&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&h=1000&fit=crop',
    ],
    category: 'women',
    subCategory: 'ethnic-w',
    sizes: ['Free Size'],
    colors: [{ name: 'Pink', hex: '#FF69B4' }, { name: 'Yellow', hex: '#FFD700' }],
    fabric: 'Chiffon',
    description: 'Elegant floral print saree with contrast border.',
    inStock: true,
    rating: 4.6,
    reviews: 312,
    isTrending: true,
  },
  {
    id: '5',
    name: 'Kids Party Wear Set',
    price: 799,
    originalPrice: 1499,
    discount: 47,
    image: 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=400&h=500&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=800&h=1000&fit=crop',
    ],
    category: 'kids',
    subCategory: 'boys',
    sizes: ['2-3Y', '4-5Y', '6-7Y', '8-9Y'],
    colors: [{ name: 'Blue', hex: '#4169E1' }, { name: 'Red', hex: '#DC143C' }],
    fabric: 'Cotton Blend',
    description: 'Stylish party wear set for kids with comfortable fit.',
    inStock: true,
    rating: 4.4,
    reviews: 78,
    isBudgetPick: true,
  },
  {
    id: '6',
    name: 'Formal Slim Fit Shirt',
    price: 899,
    originalPrice: 1599,
    discount: 44,
    image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&h=500&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&h=1000&fit=crop',
    ],
    category: 'men',
    subCategory: 'formal',
    sizes: ['38', '40', '42', '44'],
    colors: [{ name: 'White', hex: '#FFFFFF' }, { name: 'Light Blue', hex: '#ADD8E6' }],
    fabric: 'Cotton',
    description: 'Premium formal shirt with slim fit design.',
    inStock: true,
    rating: 4.2,
    reviews: 156,
    isBudgetPick: true,
  },
  {
    id: '7',
    name: 'Designer Lehenga Choli',
    price: 3499,
    originalPrice: 5999,
    discount: 42,
    image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400&h=500&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=800&h=1000&fit=crop',
    ],
    category: 'women',
    subCategory: 'ethnic-w',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [{ name: 'Red', hex: '#DC143C' }, { name: 'Gold', hex: '#FFD700' }],
    fabric: 'Silk',
    description: 'Stunning designer lehenga choli for special occasions.',
    inStock: true,
    rating: 4.9,
    reviews: 89,
    isNew: true,
  },
  {
    id: '8',
    name: 'Printed Palazzo Set',
    price: 1199,
    originalPrice: 1999,
    discount: 40,
    image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=500&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=1000&fit=crop',
    ],
    category: 'women',
    subCategory: 'casual-w',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [{ name: 'Teal', hex: '#008080' }, { name: 'Mustard', hex: '#FFDB58' }],
    fabric: 'Rayon',
    description: 'Comfortable printed palazzo set for casual outings.',
    inStock: true,
    rating: 4.5,
    reviews: 203,
    isBudgetPick: true,
  },
];

export const banners = [
  {
    id: '1',
    title: 'Festive Sale',
    subtitle: 'Up to 50% Off',
    description: 'Celebrate in style with our exclusive collection',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200&h=500&fit=crop',
    cta: 'Shop Now',
    link: '/products',
  },
  {
    id: '2',
    title: 'New Arrivals',
    subtitle: 'Fresh Styles',
    description: 'Discover the latest trends in fashion',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&h=500&fit=crop',
    cta: 'Explore',
    link: '/products?filter=new',
  },
];

export type CartItem = {
  productId: string;
  quantity: number;
  size: string;
  color: string;
};

export const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(price);
};
