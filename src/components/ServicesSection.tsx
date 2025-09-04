import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";

interface Service {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  gradient: string;
  action: string;
}

interface ServicesSectionProps {
  services: Service[];
  handleServiceClick: (service: Service) => void;
}

const ServicesSection = ({ services, handleServiceClick }: ServicesSectionProps) => {
  return (
    <div className="animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
      <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
        <div className="w-1 h-8 bg-gradient-primary rounded-full"></div>
        الخدمات المصرفية
      </h2>

      {/* Main Services Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {services.map((service, index) => (
          <Card 
            key={index} 
            className={`
              group cursor-pointer border-0 bg-gradient-card shadow-card hover:shadow-elevated 
              transition-all duration-500 hover:scale-105 relative overflow-hidden
              ${service.action === 'disabled' ? 'cursor-not-allowed' : ''}
            `}
            onClick={() => handleServiceClick(service)}
          >
            <div className={`absolute inset-0 ${service.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
            <CardContent className="p-6 text-center relative z-10">
              <div className={`
                inline-flex p-4 rounded-2xl mb-4 transition-all duration-500 group-hover:scale-110
                ${service.gradient} text-white shadow-soft
                ${service.action === 'disabled' ? 'relative' : ''}
              `}>
                {service.icon}
                {service.action === 'disabled' && (
                  <div className="absolute -top-1 -right-1 bg-card rounded-full p-1 shadow-md">
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
              </div>
              <h3 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                {service.title}
              </h3>
              <p className="text-sm text-muted-foreground">{service.subtitle}</p>
              {service.action === 'disabled' && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <Badge variant="secondary" className="font-medium">قريباً</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ServicesSection;