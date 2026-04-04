import React from 'react';

interface VideoPlayerProps {
  src?: string; // Chemin relatif ou absolu de la vidéo
  poster?: string; // Image d'aperçu facultative
  style?: React.CSSProperties;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
}

/**
 * Composant vidéo réutilisable pour MP4/WebM/Ogg, taille d'origine, contrôles natifs, responsive si besoin.
 */
const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src = '/accueil-tortue.mp4',
  poster = '',
  style = {},
  className = '',
  controls = true,
  autoPlay = false,
  loop = false,
  muted = false,
}) => (
  <video
    src={src}
    poster={poster}
    controls={controls}
    autoPlay={autoPlay}
    loop={loop}
    muted={muted}
    playsInline
    preload="auto"
    className={className}
    style={style}
  >
    Votre navigateur ne supporte pas la vidéo HTML5. <a href={src}>Télécharger la vidéo</a>.
  </video>
);

export default VideoPlayer;
