import React from 'react';
import { Link } from 'react-router-dom';
import { Disc, Shield, Film, Award } from 'lucide-react';
import { Button } from '../../components/common/Button';

export const AboutPage: React.FC = () => {
  return (
    <div className="bg-white min-h-screen py-16">
      <div className="max-w-3xl mx-auto px-6 space-y-12">
        <div className="space-y-4 text-center">
          <div className="w-14 h-14 rounded-full bg-brand-blue-soft text-brand-blue flex items-center justify-center mx-auto">
            <Disc className="w-8 h-8 stroke-[1.75]" />
          </div>
          <span className="text-xs font-mono uppercase tracking-widest text-brand-blue">
            ESTABLISHED IN LONDON, UK
          </span>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-dark tracking-tight">
            Films Worth Owning.
          </h1>
          <p className="text-base text-gray-600 leading-relaxed font-light max-w-xl mx-auto">
            AZ Rayan DVDs was founded with a singular conviction: physical media represents the purest, most permanent bond between the filmmaker and the audience.
          </p>
        </div>

        <div className="border-t border-b border-gray-100 py-10 space-y-8 text-gray-700 text-sm leading-relaxed">
          <div className="space-y-3">
            <h2 className="font-display font-bold text-xl text-dark">The Permanence of Physical Discs</h2>
            <p>
              In an age of streaming fragmentation, film lovers frequently discover that their favourite titles have disappeared from subscription platforms due to licensing changes, regional lockouts, or studio mergers.
            </p>
            <p>
              A physical DVD or Blu-ray in your collection cannot be edited remotely, deleted from a server, or rendered inaccessible by an internet outage. It is yours to cherish for decades.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="font-display font-bold text-xl text-dark">Uncompressed Cinema Audio & Special Features</h2>
            <p>
              Every edition at AZ Rayan DVDs is curated for its physical presentation: original aspect ratios, director commentaries, retrospective documentaries, and tangible sleeve artwork.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
            <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
              <Film className="w-5 h-5 text-brand-blue mb-2" />
              <h4 className="font-bold text-xs text-dark mb-1">Authentic UK PAL</h4>
              <p className="text-xs text-gray-500">Region 2 UK certified releases with BBFC age ratings.</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
              <Shield className="w-5 h-5 text-brand-blue mb-2" />
              <h4 className="font-bold text-xs text-dark mb-1">Strict Quality Check</h4>
              <p className="text-xs text-gray-500">Each case and disc undergoes optical inspection prior to dispatch.</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
              <Award className="w-5 h-5 text-brand-blue mb-2" />
              <h4 className="font-bold text-xs text-dark mb-1">Tracked Dispatch</h4>
              <p className="text-xs text-gray-500">Carefully packaged in reinforced mailers to preserve slipcovers.</p>
            </div>
          </div>
        </div>

        <div className="text-center pt-4">
          <Link to="/shop">
            <Button variant="primary" size="lg">
              Explore Our Curated DVD Vault
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
