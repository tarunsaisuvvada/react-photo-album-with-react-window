import type React from "react";
import { forwardRef, useRef, useEffect, useMemo, useCallback } from "react";
import { VariableSizeList } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";

import Component from "./Component";
import PhotoComponent from "./PhotoComponent";
import { round, srcSetAndSizes, unwrap } from "../utils";
import { CommonPhotoAlbumProps, ComponentsProps, ElementRef, LayoutModel, Photo, Render } from "../types";

export type StaticPhotoAlbumProps<TPhoto extends Photo> = Pick<
  CommonPhotoAlbumProps<TPhoto>,
  "sizes" | "onClick" | "skeleton"
> & {
  layout?: string;
  model?: LayoutModel<TPhoto>;
  render?: Render<TPhoto>;
  componentsProps?: ComponentsProps<TPhoto>;
  onItemsRendered?: (props: {
    overscanStartIndex: number;
    overscanStopIndex: number;
    visibleStartIndex: number;
    visibleStopIndex: number;
  }) => void;
  onScroll?: (props: {
    scrollDirection: "forward" | "backward";
    scrollOffset: number;
    scrollUpdateWasRequested: boolean;
  }) => void;
  scrollToIndex?: number;
};

function StaticPhotoAlbum<TPhoto extends Photo>(
  {
    layout,
    sizes,
    model,
    skeleton,
    onClick: onClickCallback,
    render: { container, track: renderTrack, photo: renderPhoto, ...restRender } = {},
    componentsProps: {
      container: containerProps,
      track: trackProps,
      link: linkProps,
      button: buttonProps,
      wrapper: wrapperProps,
      image: imageProps,
    } = {},
    onItemsRendered,
    onScroll,
    scrollToIndex,
  }: StaticPhotoAlbumProps<TPhoto>,
  ref: React.ForwardedRef<HTMLElement>,
) {
  const { spacing, padding, containerWidth, tracks = [], variables, horizontal } = model || {};
  const listRef = useRef<VariableSizeList>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  // Memoize the row-to-photo index mapping
  const rowToPhotoIndexMapping = useMemo(() => {
    return tracks.map((t) => t.photos.map((photo) => photo.index));
  }, [tracks]);

  // Create a ref to store the findRowIndexForPhoto function
  const findRowIndexForPhotoRef = useRef<(photoIndex: number) => number>(() => -1);

  // Update the findRowIndexForPhoto function stored in the ref
  useEffect(() => {
    findRowIndexForPhotoRef.current = (photoIndex: number) => {
      for (let rowIndex = 0; rowIndex < rowToPhotoIndexMapping.length; rowIndex += 1) {
        if (rowToPhotoIndexMapping[rowIndex].includes(photoIndex)) {
          return rowIndex;
        }
      }
      return -1;
    };
  }, [rowToPhotoIndexMapping]);

  useEffect(() => {
    const handleResize = () => {
      if (listRef.current) {
        listRef.current.resetAfterIndex(0);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (scrollToIndex !== undefined && listRef.current) {
      const rowIndex = findRowIndexForPhotoRef.current(scrollToIndex);
      if (rowIndex !== -1) {
        listRef.current.scrollToItem(rowIndex, "start");
      }
    }
  }, [scrollToIndex]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.resetAfterIndex(0);
    }
  }, [tracks]);

  const getItemSize = useCallback(
    (index: number) => {
      return round(tracks[index].photos[0].height, 3) + (padding || 0) * 2 + (spacing || 0);
    },
    [tracks, padding, spacing],
  );

  const handleItemsRendered = useCallback(
    ({
      overscanStartIndex,
      overscanStopIndex,
      visibleStartIndex,
      visibleStopIndex,
    }: {
      overscanStartIndex: number;
      overscanStopIndex: number;
      visibleStartIndex: number;
      visibleStopIndex: number;
    }) => {
      if (!tracks || !onItemsRendered) return;

      const convertRowIndexToPhotoIndex = (rowIndex: number, start: boolean) => {
        const trackRow = tracks[rowIndex];
        return start ? trackRow.photos[0].index : trackRow.photos[trackRow.photos.length - 1].index;
      };

      const overscanStartPhotoIndex = convertRowIndexToPhotoIndex(overscanStartIndex, true);
      const overscanStopPhotoIndex = convertRowIndexToPhotoIndex(overscanStopIndex, false);
      const visibleStartPhotoIndex = convertRowIndexToPhotoIndex(visibleStartIndex, true);
      const visibleStopPhotoIndex = convertRowIndexToPhotoIndex(visibleStopIndex, false);

      onItemsRendered({
        overscanStartIndex: overscanStartPhotoIndex,
        overscanStopIndex: overscanStopPhotoIndex,
        visibleStartIndex: visibleStartPhotoIndex,
        visibleStopIndex: visibleStopPhotoIndex,
      });
    },
    [tracks, onItemsRendered],
  );

  const combinedRef = useCallback(
    (node: HTMLElement | null) => {
      containerRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        const mutableRef = ref as React.MutableRefObject<HTMLElement | null>;
        mutableRef.current = node;
      }
    },
    [ref],
  );

  return (
    <Component
      role="group"
      aria-label="Photo album"
      {...containerProps}
      variables={{ spacing, padding, containerWidth, ...variables }}
      classes={["", layout]}
      render={container}
      ref={combinedRef}
      style={{ height: "calc(100vh - 110px)", overflowY: "auto" }}
    >
      {spacing !== undefined && padding !== undefined && containerWidth !== undefined && (
        <AutoSizer>
          {({ width: autoSizerWidth, height }) => (
            <VariableSizeList
              ref={listRef}
              itemCount={tracks.length}
              itemSize={getItemSize}
              height={height}
              width={autoSizerWidth}
              onItemsRendered={handleItemsRendered}
              onScroll={onScroll}
              style={{
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              {({ style, index: trackIndex }) => {
                const trackSize = tracks[trackIndex].photos.length;
                const photosCount = horizontal ? trackSize : tracks.length;
                return (
                  <Component
                    as="div"
                    {...trackProps}
                    key={trackIndex}
                    render={renderTrack}
                    classes="track"
                    variables={{ trackSize, ...tracks[trackIndex].variables }}
                    style={style}
                  >
                    {tracks[trackIndex].photos.map((context) => {
                      const { photo, index, width: photoWidth } = context;
                      const onClick = onClickCallback
                        ? (event: React.MouseEvent) => {
                            onClickCallback({ event, photo, index });
                          }
                        : undefined;

                      if (renderPhoto) {
                        const rendered = renderPhoto({ onClick }, context);
                        if (rendered) return rendered;
                      }

                      const ariaLabel = <T extends {}>(props: T) => {
                        return photo.label ? { "aria-label": photo.label, ...props } : props;
                      };

                      return (
                        <PhotoComponent
                          key={photo.key ?? photo.src}
                          onClick={onClick}
                          render={restRender}
                          componentsProps={{
                            image: {
                              loading: "lazy" as const,
                              decoding: "async" as const,
                              ...srcSetAndSizes(
                                photo,
                                sizes,
                                photoWidth,
                                containerWidth || 0,
                                photosCount,
                                spacing,
                                padding,
                              ),
                              ...unwrap(imageProps, context),
                            },
                            link: ariaLabel(unwrap(linkProps, context)),
                            button: ariaLabel(unwrap(buttonProps, context)),
                            wrapper: unwrap(wrapperProps, context),
                          }}
                          {...context}
                        />
                      );
                    })}
                  </Component>
                );
              }}
            </VariableSizeList>
          )}
        </AutoSizer>
      )}
      {containerWidth === undefined && skeleton}
    </Component>
  );
}

export default forwardRef(StaticPhotoAlbum) as <TPhoto extends Photo>(
  props: StaticPhotoAlbumProps<TPhoto> & ElementRef,
) => React.ReactNode;
