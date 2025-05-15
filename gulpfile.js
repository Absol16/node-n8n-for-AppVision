import gulp from 'gulp';
import path from 'path';

gulp.task('build:icons', copyIcons);

async function copyIcons() {
  const nodeSource = path.resolve('nodes', '**', '*.{png,svg}');
  const nodeDestination = path.resolve('dist', 'nodes');

  // Copie des icônes des nodes
  gulp.src(nodeSource).pipe(gulp.dest(nodeDestination));

  const credSource = path.resolve('credentials', '**', '*.{png,svg}');
  const credDestination = path.resolve('dist', 'credentials');

  // Copie des icônes des credentials
  return gulp.src(credSource).pipe(gulp.dest(credDestination));
}
