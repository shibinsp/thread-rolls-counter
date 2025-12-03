import { useState } from 'react';
import './LandingPage.css';

function LandingPage({ onGetStarted }) {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      icon: '🤖',
      title: 'AI-Powered Counting',
      description: 'Advanced YOLOv11 model accurately detects and counts thread rolls with 95%+ accuracy',
      color: '#3b82f6'
    },
    {
      icon: '✂️',
      title: 'Smart Cropping',
      description: 'Crop images before processing to focus on specific areas and improve accuracy',
      color: '#8b5cf6'
    },
    {
      icon: '🎨',
      title: 'Color Recognition',
      description: 'Automatically identifies and categorizes threads by color for detailed tracking',
      color: '#ec4899'
    },
    {
      icon: '✏️',
      title: 'Easy Corrections',
      description: 'Edit AI predictions with intuitive tools and visual bounding box editor',
      color: '#f59e0b'
    },
    {
      icon: '📊',
      title: 'Analytics Dashboard',
      description: 'Track your inventory with comprehensive statistics and activity logs',
      color: '#10b981'
    },
    {
      icon: '📱',
      title: 'Mobile Friendly',
      description: 'Take photos directly from your mobile device or upload from gallery',
      color: '#06b6d4'
    }
  ];

  const stats = [
    { value: '95%+', label: 'Accuracy Rate' },
    { value: '<2s', label: 'Processing Time' },
    { value: '∞', label: 'Thread Rolls' },
    { value: '24/7', label: 'Availability' }
  ];

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <div className="hero-gradient"></div>
          <div className="floating-shapes">
            <div className="shape shape-1"></div>
            <div className="shape shape-2"></div>
            <div className="shape shape-3"></div>
            <div className="shape shape-4"></div>
          </div>
        </div>

        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-icon">✨</span>
            <span>AI-Powered Thread Counting</span>
          </div>

          <h1 className="hero-title">
            Count Thread Rolls
            <br />
            <span className="gradient-text">Instantly & Accurately</span>
          </h1>

          <p className="hero-description">
            Revolutionary AI technology that counts thread rolls in seconds.
            Upload images, get instant results, and manage your inventory effortlessly.
          </p>

          <div className="hero-actions">
            <button className="btn-primary-large" onClick={onGetStarted}>
              <span>Get Started</span>
              <span className="btn-arrow">→</span>
            </button>
            <button className="btn-secondary-large" onClick={() => {
              document.querySelector('.features-section').scrollIntoView({
                behavior: 'smooth'
              });
            }}>
              <span>Learn More</span>
            </button>
          </div>

          <div className="hero-stats">
            {stats.map((stat, index) => (
              <div key={index} className="stat-item">
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-image">
          <div className="image-wrapper">
            <div className="image-glow"></div>
            <div className="demo-card">
              <div className="demo-card-header">
                <div className="demo-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="demo-title">Thread Counter</div>
              </div>
              <div className="demo-card-body">
                <div className="thread-preview">
                  <div className="thread-grid">
                    {Array(64).fill(0).map((_, i) => (
                      <div
                        key={i}
                        className="thread-dot"
                        style={{
                          animationDelay: `${i * 0.02}s`,
                          background: i % 3 === 0 ? '#ec4899' : i % 3 === 1 ? '#f59e0b' : '#8b5cf6'
                        }}
                      ></div>
                    ))}
                  </div>
                  <div className="count-badge">
                    <span className="count-number">114</span>
                    <span className="count-label">threads detected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-header">
          <div className="section-badge">Features</div>
          <h2 className="section-title">Everything You Need</h2>
          <p className="section-description">
            Powerful features designed to make thread counting fast, accurate, and effortless
          </p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`feature-card ${activeFeature === index ? 'active' : ''}`}
              onMouseEnter={() => setActiveFeature(index)}
            >
              <div className="feature-icon" style={{ background: `${feature.color}15`, color: feature.color }}>
                {feature.icon}
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
              <div className="feature-shine" style={{ background: feature.color }}></div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="section-header">
          <div className="section-badge">Process</div>
          <h2 className="section-title">How It Works</h2>
          <p className="section-description">
            Simple 3-step process to count your thread rolls
          </p>
        </div>

        <div className="steps-container">
          <div className="step-item">
            <div className="step-number">
              <span>1</span>
            </div>
            <div className="step-icon">📸</div>
            <h3 className="step-title">Capture or Upload</h3>
            <p className="step-description">
              Take a photo using your camera or upload an existing image of your thread rolls
            </p>
          </div>

          <div className="step-connector"></div>

          <div className="step-item">
            <div className="step-number">
              <span>2</span>
            </div>
            <div className="step-icon">✂️</div>
            <h3 className="step-title">Crop & Adjust</h3>
            <p className="step-description">
              Crop the image to focus on the area you want to count for better accuracy
            </p>
          </div>

          <div className="step-connector"></div>

          <div className="step-item">
            <div className="step-number">
              <span>3</span>
            </div>
            <div className="step-icon">🎯</div>
            <h3 className="step-title">Get Results</h3>
            <p className="step-description">
              AI instantly processes and counts threads, with options to edit and refine results
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <div className="cta-icon">🧵</div>
          <h2 className="cta-title">Ready to Get Started?</h2>
          <p className="cta-description">
            Join and start counting thread rolls with AI-powered accuracy
          </p>
          <button className="btn-cta" onClick={onGetStarted}>
            <span>Start Counting Now</span>
            <span className="btn-sparkle">✨</span>
          </button>
        </div>
        <div className="cta-background">
          <div className="cta-gradient"></div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <span className="footer-icon">🧵</span>
            <span className="footer-name">Thread Counter</span>
          </div>
          <div className="footer-text">
            AI-Powered Thread Roll Counting System
          </div>
          <div className="footer-copyright">
            © 2025 Thread Counter. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
