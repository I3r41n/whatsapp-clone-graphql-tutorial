import { AnimatedSwitch, spring } from 'react-router-transition';
import styled from 'styled-components';

const glide = (val: number) =>
  spring(val, {
    stiffness: 174,
    damping: 24,
  });

const mapStyles = (styles: any) => ({
  transform: `translateX(${styles.offset}%)`,
});

const MyAnimatedSwitch = styled(AnimatedSwitch).attrs(() => ({
  atEnter: { offset: 100 },
  atLeave: { offset: glide(-100) },
  atActive: { offset: glide(0) },
  mapStyles,
}))`
  position: relative;
  overflow: hidden;
  height: 100vh;
  width: 100vw;

  > div {
    position: absolute;
    overflow: hidden;
    height: 100vh;
    width: 100vw;
  }
`;

export default MyAnimatedSwitch;