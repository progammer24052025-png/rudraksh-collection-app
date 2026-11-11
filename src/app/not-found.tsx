import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
        <p className="font-serif text-6xl font-medium text-primary/30">404</p>
        <h1 className="mt-4 font-serif text-3xl font-medium">We couldn&apos;t find that page</h1>
        <p className="mt-3 text-muted-foreground">
          The page may have moved, or the link may be out of date. Everything in the store is one
          tap away.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild><Link href="/">Back to home</Link></Button>
          <Button asChild variant="outline"><Link href="/products">Browse products</Link></Button>
          <Button asChild variant="ghost"><Link href="/contact">Contact us</Link></Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
