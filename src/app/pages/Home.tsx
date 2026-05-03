import { Hero } from '../components/Hero';
import { Services } from '../components/Services';
import { Products } from '../components/Products';
import { VideoShowcase } from '../components/VideoShowcase';
import { ManagerWord } from '../components/ManagerWord';
import { Partners } from '../components/Partners';
import { Gallery } from '../components/Gallery';
import { Testimonials } from '../components/Testimonials';
import { BlogPreview } from '../components/BlogPreview';
import { Agencies } from '../components/Agencies';
import { ReadyCTA } from '../components/ReadyCTA';
import { Contact } from '../components/Contact';
import { PromoModal } from '../components/PromoModal';

export const Home = () => {
  return (
    <>
      <PromoModal />
      <Hero />
      <Services />
      <Products />
      <VideoShowcase />
      <Partners />
      <ManagerWord />
      <Gallery />
      <Testimonials />
      <BlogPreview />
      <ReadyCTA />
      <Agencies />
      <Contact />
    </>
  );
};
