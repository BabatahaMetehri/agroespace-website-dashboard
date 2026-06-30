import { Hero } from '../components/Hero';
import { UspStrip } from '../components/UspStrip';
import { Manifesto } from '../components/Manifesto';
import { ExpertiseRail } from '../components/ExpertiseRail';
import { PivotTech } from '../components/PivotTech';
import { EstimatorBanner } from '../components/EstimatorBanner';
import { Products } from '../components/Products';
import { VideoShowcase } from '../components/VideoShowcase';
import { ManagerWord } from '../components/ManagerWord';
import { Partners } from '../components/Partners';
import { Testimonials } from '../components/Testimonials';
import { BlogPreview } from '../components/BlogPreview';
import { Agencies } from '../components/Agencies';
import { ReadyCTA } from '../components/ReadyCTA';
import { Contact } from '../components/Contact';
import { PromoModal } from '../components/PromoModal';

/**
 * Home — cinematic chaptered narrative:
 * hero film → guarantees → manifesto → expertise rail (01) →
 * product story (02) → the machine in 3D (03) → showreel → partners →
 * leadership → social proof → journal → call to action → network → contact.
 */
export const Home = () => {
  return (
    <>
      <PromoModal />
      <Hero />
      <UspStrip />
      <Manifesto />
      <ExpertiseRail />
      <Products />
      <EstimatorBanner />
      <PivotTech />
      <VideoShowcase />
      <Partners />
      <ManagerWord />
      <Testimonials />
      <BlogPreview />
      <ReadyCTA />
      <Agencies />
      <Contact />
    </>
  );
};
