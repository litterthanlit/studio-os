import React from "react";

export function Testimonials() {
  return (
    <section className="w-full px-5 md:px-[60px] py-[60px] bg-white border-t border-[#0C0C14]/5">
      <h2 className="font-['Noto_Serif'] text-[#0C0C14] text-[32px] mb-8">
        Testimonials
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Testimonial 1 */}
        <div className="bg-[#D1E4FC] rounded-[8px] p-6 lg:p-8 flex flex-col justify-between h-[200px]">
          <p className="font-sans text-[#0C0C14] text-lg lg:text-xl font-medium leading-snug">
            "A fundamental shift in my workflow."
          </p>
          <span className="font-sans text-[#0C0C14]/60 text-sm mt-4">
            Architectural Lead
          </span>
        </div>

        {/* Testimonial 2 */}
        <div className="bg-[#D1E4FC] rounded-[8px] p-6 lg:p-8 flex flex-col justify-between h-[200px]">
          <p className="font-sans text-[#0C0C14] text-lg lg:text-xl font-medium leading-snug">
            "This approach has been richly framed."
          </p>
          <span className="font-sans text-[#0C0C14]/60 text-sm mt-4">
            Geist Sans
          </span>
        </div>

        {/* Testimonial 3 */}
        <div className="bg-[#D1E4FC] rounded-[8px] p-6 lg:p-8 flex flex-col justify-between h-[200px]">
          <p className="font-sans text-[#0C0C14] text-lg lg:text-xl font-medium leading-snug">
            "I'm wowed by the design and build."
          </p>
          <span className="font-sans text-[#0C0C14]/60 text-sm mt-4">
            Reception Park
          </span>
        </div>

      </div>
    </section>
  );
}
