import React from "react";
import { Cube } from "@phosphor-icons/react";
import { Tab } from "@headlessui/react";
import classNames from "classnames";
import styles from "@ui/layout/sidebar/styles.module.css";

export const OtherTab: React.FC = () => {
  return (
    <Tab as={React.Fragment}>
      {({ selected }) => {
        const tabButtonClassName = classNames(styles.tabButton, {
          [styles.tabButtonSelected]: selected,
        });

        return (
          <button className={tabButtonClassName}>
            <div className={styles.tabIconSlot}>
              <div className={styles.tabIconLayer}>
                <Cube size={18} color="currentColor" weight="regular" />
              </div>
            </div>
          </button>
        );
      }}
    </Tab>
  );
};
